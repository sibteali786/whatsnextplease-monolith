'use client';

import { PreviewFile } from '@/components/files/FilePreviewModal';
import { useState, useCallback } from 'react';

interface UseFilePreviewReturn {
  isPreviewOpen: boolean;
  currentFileIndex: number;
  previewFiles: PreviewFile[];
  openPreview: (files: PreviewFile[], index: number) => void;
  closePreview: () => void;
  setPreviewFiles: (files: PreviewFile[]) => void;
}

/**
 * Hook to manage file preview modal state
 * Handles opening/closing the preview and managing the file list
 */
export function useFilePreview(): UseFilePreviewReturn {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);

  const openPreview = useCallback((files: PreviewFile[], index: number) => {
    setPreviewFiles(files);
    setCurrentFileIndex(Math.max(0, Math.min(index, files.length - 1)));
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    // Optional: Clear files after animation completes
    setTimeout(() => {
      setPreviewFiles([]);
      setCurrentFileIndex(0);
    }, 150);
  }, []);

  const setFiles = useCallback((files: PreviewFile[]) => {
    setPreviewFiles(files);
  }, []);

  return {
    isPreviewOpen,
    currentFileIndex,
    previewFiles,
    openPreview,
    closePreview,
    setPreviewFiles: setFiles,
  };
}
