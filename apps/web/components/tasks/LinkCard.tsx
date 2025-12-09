'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, MessageSquare, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { LinkSource } from '@prisma/client';
import { TaskLink } from '@/types/tasks';

interface LinkCardProps {
  link: TaskLink;
  onDelete: (linkId: string) => void;
  onViewComment: (commentId: string) => void;
  isDeleting: boolean;
}

export default function LinkCard({ link, onDelete, onViewComment, isDeleting }: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceLabel = () => {
    if (link.source === LinkSource.MANUAL) {
      return 'Added manually';
    }
    if (link.sourceComment) {
      const author = link.sourceComment.authorUser
        ? `${link.sourceComment.authorUser.firstName} ${link.sourceComment.authorUser.lastName}`
        : link.sourceComment.authorClient
          ? link.sourceComment.authorClient.contactName ||
            link.sourceComment.authorClient.companyName
          : 'Unknown';

      return `Found in comment by ${author}`;
    }
    return 'From comment';
  };

  const truncateUrl = (url: string, maxLength = 60) => {
    if (url.length <= maxLength) return url;
    const start = url.slice(0, maxLength - 15);
    const end = url.slice(-12);
    return `${start}...${end}`;
  };

  return (
    <div className="flex items-start gap-3 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors group">
      {/* Favicon */}
      <div className="w-8 h-8 flex-shrink-0 mt-1">
        {link.faviconUrl && !faviconError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={link.faviconUrl}
            alt=""
            className="w-full h-full rounded object-contain"
            onError={() => {
              // Fallback to generic icon if favicon fails to load
              setFaviconError(true);
            }}
          />
        ) : (
          <div className="w-full h-full rounded bg-muted flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      {/* Content */}
      <div>
        {/* Title */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 break-words"
        >
          {link.title || new URL(link.url).hostname}
        </a>
        {/* URL */}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground truncate">{truncateUrl(link.url)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyUrl}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
        {/* Source Info */}
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>{getSourceLabel()}</span>
          {link.sourceCommentId && (
            <>
              <span>•</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => onViewComment(link.sourceCommentId!)}
                className="h-auto p-0 text-xs text-primary hover:underline"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                View comment
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0" title="Open in new tab">
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>

        {link.source === 'MANUAL' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(link.id)}
            disabled={isDeleting}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete link"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
