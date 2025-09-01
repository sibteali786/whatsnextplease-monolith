/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { fileAPI } from '@/utils/fileAPI';
import {
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getFileType, getPreviewableFiles } from '@/utils/files/utils';

// File type for preview
export interface PreviewFile {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedBy?: string;
  dateUploaded?: Date;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: PreviewFile[];
  initialIndex: number;
}

type FileType = 'image' | 'pdf' | 'document' | 'other';

// Image transformation state
interface ImageTransform {
  scale: number;
  rotation: number;
  translateX: number;
  translateY: number;
}

export function FilePreviewModal({ isOpen, onClose, files, initialIndex }: FilePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [imageTransform, setImageTransform] = useState<ImageTransform>({
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { toast } = useToast();
  const imageRef = useRef<HTMLImageElement>(null);

  // Filter to only previewable files
  const previewableFiles = getPreviewableFiles(files);
  const currentFile = previewableFiles[currentIndex];
  const fileType = currentFile ? getFileType(currentFile.fileName) : 'other';

  // Reset image transform when file changes
  const resetImageTransform = useCallback(() => {
    setImageTransform({
      scale: 1,
      rotation: 0,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  // Load file URL - only for previewable files
  const loadFileUrl = useCallback(
    async (fileId: string, fileType: FileType) => {
      setLoading(true);
      setError('');
      setFileUrl('');

      // Don't try to load URL for non-previewable files
      if (fileType === 'other') {
        setLoading(false);
        return;
      }

      try {
        const result = await fileAPI.generatePreviewUrl(fileId);

        if (result.success && result.data?.downloadUrl) {
          setFileUrl(result.data.downloadUrl);
        } else {
          throw new Error(result.error || 'Failed to load file');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error Loading File',
          description: errorMessage,
          icon: <AlertCircle size={20} />,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  // Handle file navigation
  const navigateFile = useCallback(
    (direction: 'prev' | 'next') => {
      const newIndex =
        direction === 'prev'
          ? Math.max(0, currentIndex - 1)
          : Math.min(previewableFiles.length - 1, currentIndex + 1);

      setCurrentIndex(newIndex);
      resetImageTransform();
    },
    [currentIndex, previewableFiles.length, resetImageTransform]
  );

  // Image transformation functions
  const zoomIn = useCallback(() => {
    setImageTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.25, 5),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setImageTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale * 0.8, 0.25),
    }));
  }, []);

  const rotateClockwise = useCallback(() => {
    setImageTransform(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setImageTransform(prev => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }));
  }, []);

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (fileType !== 'image') return;
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [fileType]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || fileType !== 'image') return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setImageTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, fileType, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Download file
  const handleDownload = useCallback(async () => {
    if (!currentFile) return;

    try {
      const result = await fileAPI.generateDownloadUrl(currentFile.id, {
        forceDownload: true,
      });

      if (result.success) {
        toast({
          title: 'Download Started',
          description: `Downloading ${currentFile.fileName}`,
        });
      } else {
        throw new Error(result.error || 'Failed to generate download URL');
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Failed to download file',
        icon: <AlertCircle size={20} />,
      });
    }
  }, [currentFile, toast]);

  // Open in new tab
  const handleOpenInNewTab = useCallback(() => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  }, [fileUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateFile('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateFile('next');
          break;
        case '+':
        case '=':
          e.preventDefault();
          if (fileType === 'image') zoomIn();
          break;
        case '-':
          e.preventDefault();
          if (fileType === 'image') zoomOut();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          if (fileType === 'image') {
            if (e.shiftKey) {
              rotateCounterClockwise();
            } else {
              rotateClockwise();
            }
          }
          break;
        case '0':
          e.preventDefault();
          if (fileType === 'image') resetImageTransform();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    onClose,
    navigateFile,
    fileType,
    resetImageTransform,
    rotateCounterClockwise,
    rotateClockwise,
    zoomIn,
    zoomOut,
  ]);

  // Load file when modal opens or index changes
  useEffect(() => {
    if (isOpen && currentFile) {
      loadFileUrl(currentFile.id, fileType);
    }
  }, [isOpen, currentFile?.id, fileType, loadFileUrl]);

  // Update index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, previewableFiles.length - 1)));
    }
  }, [isOpen, initialIndex, previewableFiles.length]);

  if (!isOpen || !currentFile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-7xl w-[90%] h-[90vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">{currentFile.fileName}</h2>
            <span className="text-sm text-muted-foreground">
              ({currentIndex + 1} of {previewableFiles.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Image controls */}
            {fileType === 'image' && (
              <>
                <Button variant="ghost" size="sm" onClick={zoomOut} title="Zoom Out (-)">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={zoomIn} title="Zoom In (+)">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rotateCounterClockwise}
                  title="Rotate Left (Shift+R)"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={rotateClockwise}
                  title="Rotate Right (R)"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={resetImageTransform} title="Reset (0)">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <div className="border-l mx-2 h-4" />
              </>
            )}

            {/* General controls */}
            <Button variant="ghost" size="sm" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenInNewTab} title="Open in New Tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} title="Close (Esc)">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation arrows */}
        {previewableFiles.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur"
              onClick={() => navigateFile('prev')}
              disabled={currentIndex === 0}
              title="Previous (←)"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur"
              onClick={() => navigateFile('next')}
              disabled={currentIndex === previewableFiles.length - 1}
              title="Next (→)"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading file...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => loadFileUrl(currentFile.id, fileType)}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {fileType === 'image' && fileUrl && (
                <div className="flex items-center justify-center h-full p-4 overflow-hidden">
                  <img
                    ref={imageRef}
                    src={fileUrl}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    alt={currentFile.fileName}
                    className="max-w-full max-h-full object-contain transition-transform duration-200 ease-in-out cursor-grab active:cursor-grabbing"
                    style={{
                      transform: `scale(${imageTransform.scale}) rotate(${imageTransform.rotation}deg) translate(${imageTransform.translateX}px, ${imageTransform.translateY}px)`,
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    draggable={false}
                  />
                </div>
              )}

              {(fileType === 'pdf' || fileType === 'document') && fileUrl && (
                <iframe
                  src={fileUrl}
                  className="w-full h-full border-0"
                  title={currentFile.fileName}
                  allow="fullscreen"
                />
              )}

              {fileType === 'other' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md p-8">
                    <div className="mb-6">
                      <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-lg flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
                    <p className="text-muted-foreground mb-4">
                      This file type cannot be previewed in the browser. You can download it to view
                      the contents.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleDownload} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download File
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{currentFile.fileSize}</span>
              {currentFile.uploadedBy && <span>Uploaded by {currentFile.uploadedBy}</span>}
              {currentFile.dateUploaded && (
                <span>{new Date(currentFile.dateUploaded).toLocaleDateString()}</span>
              )}
            </div>

            {fileType === 'image' && (
              <div className="text-xs">
                Scale: {Math.round(imageTransform.scale * 100)}% | Rotation:{' '}
                {imageTransform.rotation}°
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
