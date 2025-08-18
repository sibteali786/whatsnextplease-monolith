import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FileTypeIconProps extends React.HTMLAttributes<HTMLDivElement> {
  fileType: string; // Can be MIME type or file extension
  className?: string;
}

const FileTypeIcon = ({ fileType, className, ...props }: FileTypeIconProps) => {
  // Map file types to SVG paths
  const fileTypeToSvg: Record<string, string> = {
    // MIME types
    'application/pdf': '/icons/pdf.svg',
    'application/vnd.ms-excel': '/icons/spreadsheet.svg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '/icons/spreadsheet.svg',
    'application/msword': '/icons/doc.svg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '/icons/docx.svg',
    'application/vnd.ms-powerpoint': '/icons/ppt.svg',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '/icons/ppt.svg',
    'text/plain': '/icons/txt.svg',
    'text/csv': '/icons/csv.svg',
    'application/zip': '/icons/zip.svg',
    'application/x-zip-compressed': '/icons/zip.svg',
    'image/jpeg': '/icons/image.svg',
    'image/png': '/icons/image.svg',
    'image/gif': '/icons/image.svg',
    'video/mp4': '/icons/video.svg',
    'video/x-msvideo': '/icons/video.svg',

    // File extensions
    pdf: '/icons/pdf.svg',
    xls: '/icons/spreadsheet.svg',
    xlsx: '/icons/spreadsheet.svg',
    doc: '/icons/doc.svg',
    docx: '/icons/docx.svg',
    ppt: '/icons/ppt.svg',
    pptx: '/icons/ppt.svg',
    txt: '/icons/txt.svg',
    csv: '/icons/csv.svg',
    zip: '/icons/zip.svg',
    jpg: '/icons/image.svg',
    jpeg: '/icons/image.svg',
    png: '/icons/image.svg',
    gif: '/icons/image.svg',
    mp4: '/icons/video.svg',
    avi: '/icons/video.svg',
  };

  // Get file extension if fileType is a filename
  const getFileExtension = (fileType: string): string => {
    if (fileType.includes('/')) return fileType; // It's a MIME type
    return fileType.toLowerCase().split('.').pop() || fileType.toLowerCase();
  };

  const iconPath = fileTypeToSvg[getFileExtension(fileType)] || '/icons/unknown.svg';

  return (
    <div className={cn('relative', className)} {...props}>
      <Image src={iconPath} alt="File Type Icon" fill />
    </div>
  );
};

export default FileTypeIcon;
