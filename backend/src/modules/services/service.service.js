import { Service, Expert } from '../../models/index.js';
import { AppError } from '../../middleware/errorHandler.js';

/**
 * Service Management Service
 * Business logic for expert services
 */

class ServiceService {
  /**
   * Create service
   */
  async createService(expertId, serviceData) {
    // Verify expert exists and is approved
    const expert = await Expert.findById(expertId);
    if (!expert) {
      throw new AppError('Expert profile not found', 404);
    }
    
    if (expert.verificationStatus !== 'approved') {
      throw new AppError('Expert must be approved to create services', 403);
    }
    
    // Create service
    const service = await Service.create({
      expertId,
      ...serviceData,
      status: 'draft',
      isActive: false, // Services start inactive until expert activates
      stats: {
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        totalRevenue: 0,
        responseTime: 0,
      },
    });
    
    await service.populate('expertId', 'userId headline hourlyRate stats.rating stats.reviewCount');
    await service.populate('expertId.userId', 'firstName lastName profilePicture');
    
    return service;
  }
  
  /**
   * Get service by ID
   */
  async getServiceById(serviceId, includeInactive = false) {
    const query = Service.findById(serviceId)
      .populate({
        path: 'expertId',
        select: 'userId headline hourlyRate stats.rating stats.reviewCount verificationStatus',
        populate: {
          path: 'userId',
          select: 'firstName lastName profilePicture',
        },
      });
    
    if (!includeInactive) {
      query.where({ isActive: true, status: 'approved' });
    }
    
    const service = await query;
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    return service;
  }
  
  /**
   * Get expert's services
   */
  async getExpertServices(expertId, includeInactive = false) {
    const query = { expertId };
    
    if (!includeInactive) {
      query.isActive = true;
      query.status = 'approved';
    }
    
    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: 'expertId',
        select: 'userId headline stats.rating stats.reviewCount',
        populate: {
          path: 'userId',
          select: 'firstName lastName profilePicture',
        },
      });
    
    return services;
  }
  
  /**
   * Update service
   */
  async updateService(serviceId, expertId, updates) {
    const service = await Service.findById(serviceId);
    
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    // Verify ownership
    if (service.expertId.toString() !== expertId.toString()) {
      throw new AppError('Not authorized to update this service', 403);
    }
    
    // Don't allow updating these fields directly
    delete updates.expertId;
    delete updates.stats;
    delete updates.status;
    
    // Update fields
    Object.assign(service, updates);
    await service.save();
    
    await service.populate('expertId', 'userId headline hourlyRate stats.rating');
    await service.populate('expertId.userId', 'firstName lastName profilePicture');
    
    return service;
  }
  
  /**
   * Delete service (soft delete by deactivating)
   */
  async deleteService(serviceId, expertId) {
    const service = await Service.findById(serviceId);
    
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    // Verify ownership
    if (service.expertId.toString() !== expertId.toString()) {
      throw new AppError('Not authorized to delete this service', 403);
    }
    
    // Check if service has active bookings
    // TODO: Check for active bookings when Booking APIs are implemented
    
    // Soft delete by deactivating
    service.isActive = false;
    service.status = 'draft';
    await service.save();
    
    return service;
  }
  
  /**
   * Activate service
   */
  async activateService(serviceId, expertId) {
    const service = await Service.findById(serviceId);
    
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    if (service.expertId.toString() !== expertId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    service.isActive = true;
    if (service.status === 'draft') {
      service.status = 'approved'; // Auto-approve for now
    }
    await service.save();
    
    return service;
  }
  
  /**
   * Deactivate service
   */
  async deactivateService(serviceId, expertId) {
    const service = await Service.findById(serviceId);
    
    if (!service) {
      throw new AppError('Service not found', 404);
    }
    
    if (service.expertId.toString() !== expertId.toString()) {
      throw new AppError('Not authorized', 403);
    }
    
    service.isActive = false;
    await service.save();
    
    return service;
  }
  
  /**
   * Search services
   */
  async searchServices(filters) {
    const {
      query = '',
      category,
      expertId,
      minPrice,
      maxPrice,
      minDuration,
      maxDuration,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'rating',
    } = filters;
    
    const mongoQuery = {
      isActive: true,
      status: 'approved',
    };
    
    // Text search
    if (query) {
      mongoQuery.$text = { $search: query };
    }
    
    // Category filter
    if (category) {
      mongoQuery.category = category;
    }
    
    // Expert filter
    if (expertId) {
      mongoQuery.expertId = expertId;
    }
    
    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      mongoQuery['pricing.amount'] = {};
      if (minPrice !== undefined) mongoQuery['pricing.amount'].$gte = minPrice;
      if (maxPrice !== undefined) mongoQuery['pricing.amount'].$lte = maxPrice;
    }
    
    // Duration range
    if (minDuration !== undefined || maxDuration !== undefined) {
      mongoQuery.duration = {};
      if (minDuration !== undefined) mongoQuery.duration.$gte = minDuration;
      if (maxDuration !== undefined) mongoQuery.duration.$lte = maxDuration;
    }
    
    // Tags filter
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      mongoQuery.tags = { $in: tagsArray };
    }
    
    // Sorting
    const sortOptions = {
      price_low: { 'pricing.amount': 1 },
      price_high: { 'pricing.amount': -1 },
      rating: { 'stats.averageRating': -1, 'stats.totalReviews': -1 },
      popular: { 'stats.totalBookings': -1 },
      newest: { createdAt: -1 },
    };
    
    const sort = sortOptions[sortBy] || sortOptions.rating;
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [services, total] = await Promise.all([
      Service.find(mongoQuery)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'expertId',
          select: 'userId headline stats.rating stats.reviewCount verificationStatus',
          populate: {
            path: 'userId',
            select: 'firstName lastName profilePicture',
          },
        }),
      Service.countDocuments(mongoQuery),
    ]);
    
    return {
      services,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
  
  /**
   * Get featured services
   */
  async getFeaturedServices(limit = 10) {
    const services = await Service.find({
      isActive: true,
      status: 'approved',
      featured: true,
    })
      .sort({ 'stats.averageRating': -1, 'stats.totalReviews': -1 })
      .limit(limit)
      .populate({
        path: 'expertId',
        select: 'userId headline stats.rating',
        populate: {
          path: 'userId',
          select: 'firstName lastName profilePicture',
        },
      });
    
    return services;
  }
  
  /**
   * Get popular services
   */
  async getPopularServices(limit = 10) {
    const services = await Service.find({
      isActive: true,
      status: 'approved',
    })
      .sort({ 'stats.totalBookings': -1, 'stats.averageRating': -1 })
      .limit(limit)
      .populate({
        path: 'expertId',
        select: 'userId headline stats.rating',
        populate: {
          path: 'userId',
          select: 'firstName lastName profilePicture',
        },
      });
    
    return services;
  }
  
  /**
   * Get services by category
   */
  async getServicesByCategory(category, limit = 20) {
    const services = await Service.find({
      isActive: true,
      status: 'approved',
      category,
    })
      .sort({ 'stats.averageRating': -1 })
      .limit(limit)
      .populate({
        path: 'expertId',
        select: 'userId headline stats.rating',
        populate: {
          path: 'userId',
          select: 'firstName lastName profilePicture',
        },
      });
    
    return services;
  }
}

export default new ServiceService();
