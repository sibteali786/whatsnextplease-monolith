import { Router } from 'express';
import {
  suggestPrefix,
  checkPrefixUniqueness,
  validateSerialNumber,
} from '../controller/serialNumber.controller';
import { rateLimit } from 'express-rate-limit';
import { verifyTokenHybrid } from '../middleware/auth';

const router = Router();

// Rate limiter to prevent enumeration attacks
export const serialNumberRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   GET /api/task-sequences/suggest-prefix
 * @desc    Suggest a prefix for a category
 * @access  Private (authenticated users only)
 * @query   categoryId - The task category ID
 */
router.get('/suggest-prefix', serialNumberRateLimiter, verifyTokenHybrid, suggestPrefix);

/**
 * @route   GET /api/task-sequences/check-prefix
 * @desc    Check if a prefix is unique/available
 * @access  Private (authenticated users only)
 * @query   prefix - The prefix to check (e.g., "WD")
 */
router.get('/check-prefix', serialNumberRateLimiter, verifyTokenHybrid, checkPrefixUniqueness);

/**
 * @route   POST /api/task-sequences/validate
 * @desc    Validate a serial number format and availability
 * @access  Private (authenticated users only)
 * @body    { serialNumber: string }
 */
router.post('/validate', serialNumberRateLimiter, verifyTokenHybrid, validateSerialNumber);

export const serialNumberRoutes = router;
