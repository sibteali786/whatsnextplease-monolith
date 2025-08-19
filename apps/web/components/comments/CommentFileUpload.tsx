'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CircleCheckBig, CircleX, Paperclip, X } from 'lucide-react';
import { FileWithMetadataFE, UploadContextType } from '@/utils/validationSchemas';
import { getCurrentUser, UserState } from '@/utils/user';
import { ALLOWED_FILE_TYPES } from '@/utils/fileUtils';
import { fileAPI } from '@/utils/fileAPI';
import FileTypeIcon from '@/components/common/FileTypeIcon';
import { truncateFileName } from '@/utils/fileUtils';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_COMMENT = 5;

interface CommentFileUploadProps {
  taskId: string;
  onFilesChange: (fileIds: string[]) => void;
  disabled?: boolean;
}

export interface CommentFileState extends FileWithMetadataFE {
  isDeleting?: boolean;
  fileId?: string;
}

export interface CommentFileUploadRef {
  reset: () => void;
}

const CommentFileUpload = forwardRef<CommentFileUploadRef, CommentFileUploadProps>(
  ({ taskId, onFilesChange, disabled = false }, ref) => {
    const [files, setFiles] = useState<CommentFileState[]>([]);
    const [user, setUser] = useState<UserState>();
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    // Expose reset function via ref
    useImperativeHandle(ref, () => ({
      reset: () => {
        setFiles([]);
        onFilesChange([]);
      },
    }));

    useEffect(() => {
      const fetchUser = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      };
      fetchUser();
    }, []);

    // Update parent with file IDs whenever files change
    useEffect(() => {
      const fileIds = files
        .filter(file => file.fileId && file.progress === 100)
        .map(file => file.fileId!);
      onFilesChange(fileIds);
    }, [files, onFilesChange]);

    const validateFile = (file: File) => {
      if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
        toast({
          title: 'Unsupported File Type',
          description: `Supported types: ${Object.values(ALLOWED_FILE_TYPES).join(', ')}`,
          variant: 'destructive',
        });
        return false;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File Too Large',
          description: 'Files must be less than 5MB',
          variant: 'destructive',
        });
        return false;
      }

      if (files.length >= MAX_FILES_PER_COMMENT) {
        toast({
          title: 'Too Many Files',
          description: `Maximum ${MAX_FILES_PER_COMMENT} files per comment`,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFiles = Array.from(event.target.files ?? []);
      const validFiles = uploadedFiles.filter(validateFile);

      if (validFiles.length === 0) return;

      setUploading(true);

      for (const file of validFiles) {
        const fileState: CommentFileState = {
          file,
          uploadTime: new Date(),
          progress: 0,
        };

        // Add file to state immediately
        setFiles(prev => [...prev, fileState]);

        try {
          // Prepare metadata for comment file upload
          const fileSizeInKb = `${file.size / 1000}kb`;
          const payload = {
            fileName: file.name,
            fileSize: fileSizeInKb,
            uploadedBy: user?.name || 'Unknown',
            createdAt: new Date().toISOString(),
            role: user?.role?.name || 'USER',
            userId: user?.id || '',
            taskId: taskId,
            uploadContext: UploadContextType.TASK_COMMENT,
          };

          // Create FormData
          const formData = new FormData();
          formData.append('file', file);
          formData.append('metadata', JSON.stringify(payload));

          // Simulate progress
          const progressInterval = setInterval(() => {
            setFiles(prev =>
              prev.map(f =>
                f.file === file && f.progress < 90
                  ? { ...f, progress: Math.min(f.progress + 10, 90) }
                  : f
              )
            );
          }, 200);

          // Upload file
          const result = await fileAPI.uploadFile(formData);
          clearInterval(progressInterval);

          if (result.success) {
            // Update file with completion
            setFiles(prev =>
              prev.map(f =>
                f.file === file
                  ? {
                      ...f,
                      progress: 100,
                      fileId: result.data?.fileId,
                      uploadTime: new Date(result.data?.uploadTime || new Date().toISOString()),
                    }
                  : f
              )
            );
          } else {
            // Remove failed upload
            setFiles(prev => prev.filter(f => f.file !== file));
            toast({
              title: 'Upload Failed',
              description: `Failed to upload "${file.name}": ${result.error || 'Unknown error'}`,
              variant: 'destructive',
              icon: <CircleX size={20} />,
            });
          }
        } catch (error) {
          setFiles(prev => prev.filter(f => f.file !== file));
          toast({
            title: 'Upload Error',
            description: `Error uploading "${file.name}": ${error}`,
            variant: 'destructive',
            icon: <CircleX size={20} />,
          });
        }
      }

      setUploading(false);
      // Reset input
      event.target.value = '';
    };

    const removeFile = async (index: number) => {
      const fileState = files[index];
      if (!fileState) return;

      // If file hasn't been uploaded yet, just remove from UI
      if (!fileState.fileId) {
        setFiles(prev => prev.filter((_, i) => i !== index));
        return;
      }

      try {
        setFiles(prev => prev.map((f, i) => (i === index ? { ...f, isDeleting: true } : f)));

        const result = await fileAPI.deleteFile(fileState.fileId);

        if (result.success) {
          setFiles(prev => prev.filter((_, i) => i !== index));
          toast({
            title: 'File Removed',
            description: `"${fileState.file.name}" has been removed`,
            variant: 'success',
            icon: <CircleCheckBig size={20} />,
          });
        } else {
          toast({
            title: 'Delete Failed',
            description: result.error || 'Failed to delete file',
            variant: 'destructive',
            icon: <CircleX size={20} />,
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'An error occurred while deleting the file: ' + (error instanceof Error ? error.message : String(error)),
          variant: 'destructive',
          icon: <CircleX size={20} />,
        });
      } finally {
        setFiles(prev => prev.map((f, i) => (i === index ? { ...f, isDeleting: false } : f)));
      }
    };

    return (
      <div className="space-y-3">
        {/* File Upload Button */}
        <div className="flex items-center gap-2">
          <Input
            id="comment-file-input"
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={disabled || uploading}
            accept={Object.keys(ALLOWED_FILE_TYPES).join(',')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            disabled={disabled || uploading || files.length >= MAX_FILES_PER_COMMENT}
          >
            <Label htmlFor="comment-file-input" className="cursor-pointer flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attach Files
            </Label>
          </Button>
          {files.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {files.length}/{MAX_FILES_PER_COMMENT} files
            </span>
          )}
        </div>

        {/* File Previews - Better Layout */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2">
              {files.map((fileData, index) => (
                <div
                  key={`${fileData.file.name}-${index}`}
                  className="flex items-center gap-3 p-2 border rounded-lg bg-muted/50"
                >
                  {/* File Icon */}
                  <div className="w-8 h-8 flex-shrink-0">
                    <FileTypeIcon fileType={fileData.file.type} />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {truncateFileName(fileData.file.name, 30)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(fileData.file.size / 1024).toFixed(1)} KB</span>
                      {fileData.progress < 100 && (
                        <>
                          <span>•</span>
                          <span>{fileData.progress}% uploaded</span>
                        </>
                      )}
                      {fileData.progress === 100 && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">Uploaded</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {fileData.progress < 100 && (
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${fileData.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Remove Button */}
                  {!fileData.isDeleting && fileData.progress === 100 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}

                  {/* Delete Loading */}
                  {fileData.isDeleting && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

CommentFileUpload.displayName = 'CommentFileUpload';

export default CommentFileUpload;
