import { PreviewFile } from '@/components/files/FilePreviewModal';
import { documentExtensions, imageExtensions, mediaTypes } from '@/utils/files/constants';
export const getFileType = (fileName: string) => {
  const extension = fileName.toLowerCase().split('.').pop() || '';

  if (imageExtensions.includes(extension)) {
    return 'image';
  }
  if (extension === 'pdf') {
    return 'pdf';
  }
  if (documentExtensions.includes(extension)) {
    return 'document';
  }
  return 'other';
};

export const isPreviewable = (fileName: string) => {
  const fileType = getFileType(fileName);
  return mediaTypes.includes(fileType);
};

export const getPreviewableFiles = (files: PreviewFile[]): PreviewFile[] => {
  return files.filter(file => {
    const type = getFileType(file.fileName);
    return ['image', 'pdf', 'document'].includes(type);
  });
};
export const formatFileSize = (size: string) => {
  const fileSize = parseInt(size, 10) / 1024; // Convert bytes to KB
  if (isNaN(fileSize)) return 'N/A';
  const wholePart = fileSize.toString().split('.')[0];
  if (wholePart && wholePart.length > 3) {
    return `${(fileSize / 1024).toPrecision(4)} MB`;
  }
  return `${(fileSize).toPrecision(4)} KB`;
};
