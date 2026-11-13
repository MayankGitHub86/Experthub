import expertService from './expert.service.js';
import {
  createExpertSchema,
  updateExpertSchema,
  approveExpertSchema,
  rejectExpertSchema,
  suspendExpertSchema,
  searchExpertsSchema,
} from './expert.validation.js';

/**
 * Expert Controllers
 * HTTP request handlers for expert endpoints
 */

/**
 * @route   POST /api/v1/experts
 * @desc    Create expert profile
 * @access  Private
 */
export const createExpert = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createExpertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.createExpert(req.user.id, value);
    
    res.status(201).json({
      success: true,
      message: 'Expert profile created successfully',
      data: expert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts
 * @desc    Search and filter experts
 * @access  Public
 */
export const searchExperts = async (req, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = searchExpertsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const result = await expertService.searchExperts(value);
    
    res.status(200).json({
      success: true,
      data: result.experts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts/featured
 * @desc    Get featured experts
 * @access  Public
 */
export const getFeaturedExperts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const experts = await expertService.getFeaturedExperts(limit);
    
    res.status(200).json({
      success: true,
      data: experts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts/top-rated
 * @desc    Get top-rated experts
 * @access  Public
 */
export const getTopRatedExperts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const experts = await expertService.getTopRatedExperts(limit);
    
    res.status(200).json({
      success: true,
      data: experts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts/me
 * @desc    Get current user's expert profile
 * @access  Private (Expert)
 */
export const getMyExpertProfile = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    
    // Calculate profile completeness
    const completeness = expertService.calculateProfileCompleteness(expert);
    
    res.status(200).json({
      success: true,
      data: {
        ...expert.toObject(),
        profileCompleteness: completeness,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/experts/:id
 * @desc    Get expert by ID
 * @access  Public
 */
export const getExpertById = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: expert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/experts/me
 * @desc    Update expert profile
 * @access  Private (Expert)
 */
export const updateExpert = async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = updateExpertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    // Get expert by user ID
    const expert = await expertService.getExpertByUserId(req.user.id);
    
    // Update expert
    const updatedExpert = await expertService.updateExpert(expert._id, req.user.id, value);
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedExpert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/experts/me/submit-verification
 * @desc    Submit expert profile for verification
 * @access  Private (Expert)
 */
export const submitForVerification = async (req, res, next) => {
  try {
    const expert = await expertService.getExpertByUserId(req.user.id);
    const updatedExpert = await expertService.submitForVerification(expert._id, req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Profile submitted for verification',
      data: updatedExpert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/admin/experts/pending
 * @desc    Get experts pending verification
 * @access  Private (Admin)
 */
export const getPendingExperts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await expertService.getPendingExperts(page, limit);
    
    res.status(200).json({
      success: true,
      data: result.experts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/admin/experts/:id/approve
 * @desc    Approve expert profile
 * @access  Private (Admin)
 */
export const approveExpert = async (req, res, next) => {
  try {
    const { error, value } = approveExpertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.approveExpert(
      req.params.id,
      req.user.id,
      value.notes,
      value.verifiedBadge
    );
    
    res.status(200).json({
      success: true,
      message: 'Expert approved successfully',
      data: expert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/admin/experts/:id/reject
 * @desc    Reject expert profile
 * @access  Private (Admin)
 */
export const rejectExpert = async (req, res, next) => {
  try {
    const { error, value } = rejectExpertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.rejectExpert(
      req.params.id,
      req.user.id,
      value.notes
    );
    
    res.status(200).json({
      success: true,
      message: 'Expert rejected',
      data: expert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/admin/experts/:id/suspend
 * @desc    Suspend expert profile
 * @access  Private (Admin)
 */
export const suspendExpert = async (req, res, next) => {
  try {
    const { error, value } = suspendExpertSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    
    const expert = await expertService.suspendExpert(
      req.params.id,
      req.user.id,
      value.reason
    );
    
    res.status(200).json({
      success: true,
      message: 'Expert suspended',
      data: expert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/admin/experts/:id/reactivate
 * @desc    Reactivate suspended expert
 * @access  Private (Admin)
 */
export const reactivateExpert = async (req, res, next) => {
  try {
    const expert = await expertService.reactivateExpert(req.params.id, req.user.id);
    
    res.status(200).json({
      success: true,
      message: 'Expert reactivated',
      data: expert,
    });
  } catch (error) {
    next(error);
  }
};
