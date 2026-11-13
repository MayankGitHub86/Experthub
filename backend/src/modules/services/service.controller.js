import serviceService from './service.service.js';
import expertService from '../experts/expert.service.js';
import {
  createServiceSchema,
  updateServiceSchema,
  searchServicesSchema,
} from './service.validation.js';

/**
 * Service Controllers
 * HTTP request handlers for service endpoints
 */

/**
 * @route   POST /api/v1/services
 * @desc    Create service
 * @access  Private (Expert)
 */
export const createService = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    // Get expert profile
    const expert = await expertService.getExpertByUserId(req.user.id);
    
    const service = await serviceService.createService(expert._id, value);
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services
 * @desc    Search and filter services
 * @access  Public
 */
export const searchServices = async (req, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = searchServicesSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const result = await serviceService.searchServices(value);
    
    res.status(200).json({
      success: true,
      data: result.services,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services/featured
 * @desc    Get featured services
 * @access  Public
 */
export const getFeaturedServices = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const services = await serviceService.getFeaturedServices(limit);
    
    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services/popular
 * @desc    Get popular services
 * @access  Public
 */
export const getPopularServices = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const services = await serviceService.getPopularServices(limit);
    
    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services/category/:category
 * @desc    Get services by category
 * @access  Public
 */
export const getServicesByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const services = await serviceService.getServicesByCategory(category, limit);
    
    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services/:id
 * @desc    Get service by ID
 * @access  Public
 */
export const getServiceById = async (req, res, next) => {
  try {
    const service = await serviceService.getServiceById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services/expert/:expertId
 * @desc    Get expert's services
 * @access  Public
 */
export const getExpertServices = async (req, res, next) => {
  try {
    const services = await serviceService.getExpertServices(req.params.expertId);
    
    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/services/me/all
 * @desc    Get my services (including inactive)
 * @access  Private (Expert)
 */
export const getMyServices = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    const services = await serviceService.getExpertServices(expert._id, true);
    
    res.status(200).json({
      success: true,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/services/:id
 * @desc    Update service
 * @access  Private (Expert - Owner)
 */
export const updateService = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = updateServiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    // Get expert profile
    const expert = await expertService.getExpertByUserId(req.user.id);
    
    const service = await serviceService.updateService(req.params.id, expert._id, value);
    
    res.status(200).json({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/services/:id
 * @desc    Delete service (soft delete)
 * @access  Private (Expert - Owner)
 */
export const deleteService = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    await serviceService.deleteService(req.params.id, expert._id);
    
    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/services/:id/activate
 * @desc    Activate service
 * @access  Private (Expert - Owner)
 */
export const activateService = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    const service = await serviceService.activateService(req.params.id, expert._id);
    
    res.status(200).json({
      success: true,
      message: 'Service activated',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/services/:id/deactivate
 * @desc    Deactivate service
 * @access  Private (Expert - Owner)
 */
export const deactivateService = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    const service = await serviceService.deactivateService(req.params.id, expert._id);
    
    res.status(200).json({
      success: true,
      message: 'Service deactivated',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};
