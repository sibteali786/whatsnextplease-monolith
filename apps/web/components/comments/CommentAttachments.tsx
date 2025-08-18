'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, CircleX } from 'lucide-react';
import { fileAPI } from '@/utils/fileAPI';
import { CommentFile } from '@/utils/commentSchemas';
import FileTypeIcon from '@/components/common/FileTypeIcon';
import { truncateFileName } from '@/utils/fileUtils';

interface CommentAttachmentsProps {
  files: CommentFile[];
  compact?: boolean;
}

export default function CommentAttachments({ files, compact = false }: CommentAttachmentsProps) {
  const [loadingFileIds, setLoadingFileIds] = useState<string[]>([]);
  const { toast } = useToast();

  const handleDownload = async (file: CommentFile['file']) => {
    setLoadingFileIds(prev => [...prev, file.id]);

    try {
      const result = await fileAPI.generateDownloadUrl(file.id);

      if (result.success && 'downloadUrl' in result && 'fileName' in result) {
        const downloadLink = document.createElement('a');
        downloadLink.href = result.downloadUrl as string;
        downloadLink.setAttribute('download', (result.fileName as string) || file.fileName);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        toast({
          title: 'Download Failed',
          description: result.error || result.message || 'Failed to generate download URL',
          variant: 'destructive',
          icon: <CircleX size={20} />,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while downloading the file' + error,
        variant: 'destructive',
        icon: <CircleX size={20} />,
      });
    } finally {
      setLoadingFileIds(prev => prev.filter(id => id !== file.id));
    }
  };

  if (files.length === 0) return null;

  return (
    <div className={`space-y-2 ${compact ? 'mt-2' : 'mt-3'}`}>
      <div className={`flex flex-wrap gap-2 ${compact ? 'max-w-md' : ''}`}>
        {files.map(({ file }) => (
          <Button
            key={file.id}
            variant="outline"
            size={compact ? 'sm' : 'default'}
            onClick={() => handleDownload(file)}
            disabled={loadingFileIds.includes(file.id)}
            className={`flex items-center gap-2 ${compact ? 'h-8 px-2' : 'h-10 px-3'} max-w-[200px]`}
          >
            <FileTypeIcon fileType={file.fileName} className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            <span className="truncate text-xs">
              {truncateFileName(file.fileName, compact ? 15 : 20)}
            </span>
            {loadingFileIds.includes(file.id) ? (
              <div
                className={`animate-spin border-2 border-current border-t-transparent rounded-full ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}
              />
            ) : (
              <Download className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            )}
          </Button>
        ))}
      </div>
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} attachment{files.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
