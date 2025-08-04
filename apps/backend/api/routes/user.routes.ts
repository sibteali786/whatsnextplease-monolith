import { Router } from 'express';
import { UserController } from '../controller/user.controller';
import { requireRole, verifyToken } from '../middleware/auth';
import multer from 'multer';
import { Roles } from '@prisma/client';
const router = Router();
const controller = new UserController();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
const permissionMiddleware = [verifyToken, requireRole([Roles.SUPER_USER])];

router.patch(
  '/profilePicture',
  verifyToken,
  upload.single('file'),
  controller.updateProfilePicture
);
router.get('/profile', verifyToken, controller.getUserProfile);
router.patch('/profile', verifyToken, controller.updateProfile);
/**
 * GET /users/available-roles
 * Get available roles for dropdown (excludes CLIENT)
 * Only accessible by SUPER_USER
 */
router.get('/available-roles', permissionMiddleware, controller.getAvailableRolesHandler);
/**
 * GET /users/permissions/roles
 * Get all users with their roles for permission management
 * Only accessible by SUPER_USER
 */
router.get('/permissions/roles', permissionMiddleware, controller.getUsersWithRolesHandler);
router.delete(
  '/:id',
  verifyToken,
  requireRole([Roles.SUPER_USER, Roles.TASK_SUPERVISOR]),
  controller.deleteUser
);
router.get('/me', verifyToken, controller.getCurrentUser);

/**
 * PUT /users/:userId/role
 * Update user role
 * Only accessible by SUPER_USER
 */
router.put('/:userId/role', permissionMiddleware, controller.updateUserRoleHandler);

export const userRoutes = router;
