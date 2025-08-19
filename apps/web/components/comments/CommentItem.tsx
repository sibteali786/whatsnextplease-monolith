'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, MoreHorizontal, CircleCheckBig } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Comment } from '@/utils/commentSchemas';
import { deleteComment } from '@/actions/commentActions';
import CommentForm from './CommentForm';
import CommentAttachments from './CommentAttachments';
import { getCurrentUser } from '@/utils/user';
import { useEffect } from 'react';
import { CreatorType } from '@prisma/client';

interface CommentItemProps {
  comment: Comment;
  onCommentUpdated: (updatedComment: Comment) => void;
  onCommentDeleted: (commentId: string) => void;
  onDataChange?: () => void;
}

export default function CommentItem({
  comment,
  onCommentUpdated,
  onCommentDeleted,
  onDataChange,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const { toast } = useToast();

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // User can edit/delete their own comments
      if (comment.authorType === CreatorType.USER && comment.authorUser?.id === currentUser.id) {
        setCanEdit(true);
        setCanDelete(true);
      } else if (
        comment.authorType === CreatorType.CLIENT &&
        comment.authorClient?.id === currentUser.id
      ) {
        setCanEdit(true);
        setCanDelete(true);
      }

      // Super users can delete any comment
      if (currentUser.role?.name === 'SUPER_USER') {
        setCanDelete(true);
      }

      // Task supervisors can delete any comment
      if (currentUser.role?.name === 'TASK_SUPERVISOR') {
        setCanDelete(true);
      }
    };

    checkPermissions();
  }, [comment]);

  const handleDelete = async () => {
    if (!canDelete || deleting) return;

    const confirmed = window.confirm('Are you sure you want to delete this comment?');
    if (!confirmed) return;

    const hasFiles = comment.commentFiles.length > 0;
    setDeleting(true);

    try {
      const result = await deleteComment(comment.id);

      if (result.success) {
        onCommentDeleted(comment.id);
        if (hasFiles && onDataChange) {
          onDataChange();
        }
        toast({
          title: 'Comment Deleted',
          description: 'The comment has been deleted successfully.',
          variant: 'success',
          icon: <CircleCheckBig size={20} />,
        });
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete comment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred' + error,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditComplete = (updatedComment: Comment) => {
    setIsEditing(false);
    onCommentUpdated(updatedComment);
  };

  const getAuthorName = () => {
    if (comment.authorType === CreatorType.USER && comment.authorUser) {
      return `${comment.authorUser.firstName || ''} ${comment.authorUser.lastName || ''}`.trim();
    }
    if (comment.authorType === CreatorType.CLIENT && comment.authorClient) {
      return comment.authorClient.contactName || comment.authorClient.companyName || 'Client';
    }
    return 'Unknown User';
  };

  const getAuthorAvatar = () => {
    if (comment.authorType === CreatorType.USER && comment.authorUser) {
      return comment.authorUser.avatarUrl;
    }
    if (comment.authorType === CreatorType.CLIENT && comment.authorClient) {
      return comment.authorClient.avatarUrl;
    }
    return null;
  };

  const getAuthorInitials = () => {
    const name = getAuthorName();
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }).format(date);
    }
  };

  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card">
      {/* Avatar */}
      <Avatar className="w-8 h-8 mt-1">
        <AvatarImage src={getAuthorAvatar() || undefined} />
        <AvatarFallback className="text-xs">{getAuthorInitials()}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{getAuthorName()}</span>
            <span className="text-muted-foreground">{formatDate(new Date(comment.createdAt))}</span>
            {comment.isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
          </div>

          {/* Actions */}
          {(canEdit || canDelete) && !deleting && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <CommentForm
            taskId={comment.taskId}
            editingComment={comment}
            onCommentAdded={handleEditComplete}
            onEditComplete={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap break-words m-0">{comment.content}</p>
            </div>

            {/* Attachments */}
            {comment.commentFiles.length > 0 && (
              <CommentAttachments files={comment.commentFiles} compact />
            )}
          </>
        )}
      </div>
    </div>
  );
}
