import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Trash2Icon } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '../ui/progress';
import { useState } from 'react';
import FileTypeIcon from './FileTypeIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateFileName } from '@/utils/fileUtils';
import { FileState } from './FileUploadArea';

interface FilePreviewProps {
  fileData: FileState;
  onRemove: () => void;
}

const FilePreview = ({ fileData, onRemove }: FilePreviewProps) => {
  const isUploading = fileData?.progress < 100;
  const [isOptionVisible, setIsOptionVisible] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="w-48 h-48 relative">
          <CardHeader
            className="p-2 flex items-center justify-center relative h-[138px] space-y-0"
            onMouseEnter={() => setIsOptionVisible(true)}
            onMouseLeave={() => setIsOptionVisible(false)}
          >
            <FileTypeIcon fileType={fileData.file.type} />

            {/* Show upload progress or deletion loading */}
            {(isUploading || fileData.isDeleting) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-end rounded-t-lg">
                {isUploading ? (
                  <div className="w-full bg-gray-300 h-2">
                    <Progress className="h-2 rounded-none" value={fileData.progress} />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            )}

            {/* Show delete button only when not uploading or deleting */}
            {isOptionVisible && !isUploading && !fileData.isDeleting && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-t-lg">
                <Trash2Icon
                  onClick={onRemove}
                  className="absolute top-2 right-2 h-8 w-8 cursor-pointer text-black bg-white hover:bg-white/80 p-1 rounded-lg"
                />
              </div>
            )}
          </CardHeader>

          {/* Footer */}
          <CardFooter className="flex flex-col items-start justify-between p-2 dark:bg-white/30 bg-white rounded-b-lg">
            <p className="text-sm font-bold">
              {truncateFileName(fileData.file.name, 20)} {/* Example: Max 20 characters */}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(fileData.uploadTime, 'dd MMM, yyyy, h:mm a')}
            </p>
          </CardFooter>
        </Card>
      </TooltipTrigger>
      <TooltipContent>
        <p>{fileData.file.name}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default FilePreview;
