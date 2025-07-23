import { Router } from 'express';
import { FileController } from '../controller/file.controller';
import { verifyToken, requireRole } from '../middleware/auth';
import { Roles } from '@prisma/client';

const router = Router();
const controller = new FileController();

// Authentication middleware - all file operations require authentication
const authMiddleware = [verifyToken];

// Routes for file operations

// Upload file with metadata
router.post('/upload', authMiddleware, FileController.uploadMiddleware, controller.uploadFile);

// Legacy route for compatibility with existing frontend (/api/uploadAndSaveFile)
router.post(
  '/upload-and-save',
  authMiddleware,
  FileController.uploadMiddleware,
  controller.legacyUploadAndSaveFile
);

// Delete file by ID
router.delete('/:id', authMiddleware, controller.deleteFileById);

// Generate download URL by file ID
router.get('/:id/download', authMiddleware, controller.generateDownloadUrl);

// Generate download URL by file key (for direct S3 access)
router.post('/download-url', authMiddleware, controller.generateDownloadUrlByKey);

// Get file details
router.get('/:id', authMiddleware, controller.getFileDetails);

// Routes that require higher permissions (file management for other users)
const adminMiddleware = [
  verifyToken,
  requireRole([
    Roles.SUPER_USER,
    Roles.TASK_SUPERVISOR,
    Roles.DISTRICT_MANAGER,
    Roles.TERRITORY_MANAGER,
  ]),
];

// Admin routes for managing files across the system
router.delete('/admin/:id', adminMiddleware, controller.deleteFileById);

// Batch operations for admins
// router.post(
//   '/admin/batch-delete',
//   adminMiddleware,
//   async (req, res, next) => {
//     // This could be expanded for batch operations
//     try {
//       const { fileIds } = req.body;
//       if (!fileIds || !Array.isArray(fileIds)) {
//         return res.status(400).json({
//           success: false,
//           message: 'fileIds array is required',
//         });
//       }

//       const results = await Promise.allSettled(
//         fileIds.map(id => controller.deleteFileById(req, res, next))
//       );

//       res.json({
//         success: true,
//         results: results.map((result, index) => ({
//           fileId: fileIds[index],
//           success: result.status === 'fulfilled',
//           error: result.status === 'rejected' ? result.reason : null,
//         })),
//       });
//     } catch (error) {
//       next(error);
//     }
//   }
// );

export const fileRoutes = router;
