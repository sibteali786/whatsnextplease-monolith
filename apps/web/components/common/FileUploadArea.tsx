// FileUploadArea.tsx
import { useEffect, useState } from 'react';
import FilePreview from './FilePreview';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { CircleCheckBig, CircleX } from 'lucide-react';
import logger from '@/utils/logger';
import { FileWithMetadataFE } from '@/utils/validationSchemas';
import { deleteFileFromS3 } from '@/db/repositories/files/deleteFileFromS3';
import { useCreatedTask } from '@/store/useTaskStore';
import { getCurrentUser, UserState } from '@/utils/user';
import { ALLOWED_FILE_TYPES, sanitizeFileName } from '@/utils/fileUtils';

const MAX_CONCURRENT_UPLOADS = 3;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000; // 1 second

interface FileUploadAreaProps {
  onFilesChange: (files: FileWithMetadataFE[]) => void;
}

export interface FileState extends FileWithMetadataFE {
  isDeleting?: boolean;
}

const FileUploadArea = ({ onFilesChange }: FileUploadAreaProps) => {
  const [files, setFiles] = useState<FileState[]>([]);
  const { toast } = useToast();
  const { createdTask } = useCreatedTask();
  const taskId: string = createdTask?.id ?? '';
  const [user, setUser] = useState<UserState>();
  const [inProgressUploads] = useState(new Set<FileState>());

  useEffect(() => {
    const gettingUserInfo = async () => {
      const user = await getCurrentUser();
      setUser(user);
    };
    gettingUserInfo();
  }, []);

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

    return true;
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    const validFiles = droppedFiles.filter(validateFile);
    const filesWithMetadata = validFiles.map(file => ({
      file,
      uploadTime: new Date(),
      progress: 0,
    }));
    const updatedFiles = [...files, ...filesWithMetadata];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    uploadFilesWithConcurrencyLimit(filesWithMetadata);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files ?? []);
    const validFiles = uploadedFiles.filter(validateFile);
    const filesWithMetadata = validFiles.map(file => ({
      file,
      uploadTime: new Date(),
      progress: 0,
    }));
    const updatedFiles = [...files, ...filesWithMetadata];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    uploadFilesWithConcurrencyLimit(filesWithMetadata);
  };

  const uploadFilesWithConcurrencyLimit = async (fileQueue: FileWithMetadataFE[]) => {
    const processNext = async () => {
      if (fileQueue.length === 0) return;
      if (inProgressUploads.size >= MAX_CONCURRENT_UPLOADS) return;

      const nextFile = fileQueue.shift();
      if (!nextFile) return;

      inProgressUploads.add(nextFile);

      try {
        const interval = setInterval(() => {
          setFiles(prevFiles =>
            prevFiles.map(f => {
              if (f.file === nextFile.file && f.progress < 90) {
                return { ...f, progress: Math.min(f.progress + 10, 90) };
              }
              return f;
            })
          );
        }, 300);

        // Prepare metadata payload
        const fileSizeInKb = `${nextFile.file.size / 1000}kb`;
        const payload = {
          fileName: nextFile.file.name,
          fileSize: fileSizeInKb,
          uploadedBy: user?.name,
          createdAt: new Date().toISOString(),
          role: user?.role?.name,
          userId: user?.id,
          taskId: taskId,
        };

        // Create FormData
        const formData = new FormData();
        formData.append('file', nextFile.file);
        formData.append('metadata', JSON.stringify(payload));

        const response = await fetch('/api/uploadAndSaveFile', {
          method: 'POST',
          body: formData,
        });

        clearInterval(interval);

        const json = await response.json();

        if (response.ok && json.success) {
          // Update file progress to 100%
          setFiles(prevFiles =>
            prevFiles.map(f =>
              f.file === nextFile.file
                ? { ...f, progress: 100, uploadTime: json.data.uploadTime }
                : f
            )
          );
          toast({
            title: 'File Upload Successful',
            description: `The file "${nextFile.file.name}" has been uploaded and saved.`,
            variant: 'success',
            icon: <CircleCheckBig size={40} />,
          });
        } else {
          setFiles(prevFiles => prevFiles.filter(f => f.file !== nextFile.file));
          toast({
            title: 'File Upload Failed',
            description: `The file "${nextFile.file.name}" failed to upload. ${json.message ?? ''}`,
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      } catch (error) {
        setFiles(prevFiles => prevFiles.filter(f => f.file !== nextFile.file));
        toast({
          title: 'File Upload Failed',
          description: `The file "${nextFile.file.name}" failed to upload.`,
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
        logger.error(error, `Failed to upload ${nextFile.file.name}`);
      } finally {
        inProgressUploads.delete(nextFile);
        processNext();
      }
    };

    Array.from({ length: MAX_CONCURRENT_UPLOADS }).forEach(processNext);
  };

  const removeFile = async (index: number, retryCount = 0) => {
    if (!files[index]) {
      logger.warn('File index not found');
      return;
    }

    const file = files[index].file;

    try {
      // Show loading state
      setFiles(prevFiles =>
        prevFiles.map((f, i) => (i === index ? { ...f, isDeleting: true } : f))
      );
      const s3FileKey = `tasks/${taskId}/users/${user?.id}/${sanitizeFileName(file.name)}`;
      const result = await deleteFileFromS3(s3FileKey);

      if (result.success) {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
        toast({
          title: 'File Deleted Successfully',
          description: `The file "${file.name}" has been deleted.`,
          variant: 'success',
          icon: <CircleCheckBig size={40} />,
        });
      } else if (retryCount < MAX_RETRY_ATTEMPTS) {
        logger.warn(`Retry attempt ${retryCount + 1} for deleting ${file.name}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        await removeFile(index, retryCount + 1);
      } else {
        logger.error(`Failed to delete ${file.name} after ${MAX_RETRY_ATTEMPTS} attempts`);
        toast({
          title: 'File Deletion Failed',
          description: `The file "${file.name}" failed to delete after multiple attempts.`,
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      }
    } catch (error) {
      logger.error(error, `Error deleting file: ${file.name}`);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the file.',
        variant: 'destructive',
      });
    } finally {
      // Clear loading state if operation failed
      setFiles(prevFiles =>
        prevFiles.map((f, i) => (i === index ? { ...f, isDeleting: false } : f))
      );
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={e => {
          // Allow keyboard users to trigger file upload dialog with Enter key
          if (e.key === 'Enter') {
            document.getElementById('file-input')?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="File upload drop zone"
        className="border-2 border-dashed rounded-lg h-32 flex flex-row gap-2 items-center justify-center border-gray-400 hover:border-gray-500"
      >
        <p className="text-sm text-muted-foreground">Drag files here or</p>
        <Input
          id="file-input"
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button type="button" asChild>
          <Label htmlFor="file-input" className="cursor-pointer">
            Browse
          </Label>
        </Button>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {files.map((fileData, index) => (
            <FilePreview key={index} fileData={fileData} onRemove={() => removeFile(index)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadArea;

// FIXME: Calling remove readily / almost simultaenously causues isse that later file is not removed ( from UI )but from backend its removed fix it
