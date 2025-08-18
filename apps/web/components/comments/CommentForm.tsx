'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send, X } from 'lucide-react';
import CommentFileUpload from './CommentFileUpload';
import { Comment } from '@/utils/commentSchemas';
import { createComment, updateComment } from '@/actions/commentActions';

interface CommentFormProps {
  taskId: string;
  onCommentAdded: (comment: Comment) => void;
  editingComment?: Comment;
  onEditComplete?: () => void;
  onCancel?: () => void;
}

export default function CommentForm({
  taskId,
  onCommentAdded,
  editingComment,
  onEditComplete,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState(editingComment?.content || '');
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileUploadRef = useRef<{ reset: () => void }>(null); // Add ref for file upload
  const { toast } = useToast();

  const isEditing = !!editingComment;
  const canSubmit = content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);

    try {
      if (isEditing) {
        // Update existing comment
        const result = await updateComment({
          commentId: editingComment.id,
          content: content.trim(),
        });

        if (result.success && result.comment) {
          onCommentAdded(result.comment);
          if (onEditComplete) onEditComplete();
          toast({
            title: 'Comment Updated',
            description: 'Your comment has been updated successfully.',
            variant: 'success',
          });
        } else {
          toast({
            title: 'Update Failed',
            description: result.error || 'Failed to update comment',
            variant: 'destructive',
          });
        }
      } else {
        // Create new comment
        const result = await createComment({
          taskId,
          content: content.trim(),
          fileIds: fileIds.length > 0 ? fileIds : undefined,
        });

        if (result.success && result.comment) {
          onCommentAdded(result.comment);

          // Clear form state after successful submission
          setContent('');
          setFileIds([]);

          // Reset file upload component
          if (fileUploadRef.current) {
            fileUploadRef.current.reset();
          }

          toast({
            title: 'Comment Added',
            description: 'Your comment has been added successfully.',
            variant: 'success',
          });
        } else {
          toast({
            title: 'Comment Failed',
            description: result.error || 'Failed to add comment',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred' + error,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      setContent(editingComment?.content || '');
      if (onCancel) onCancel();
    } else {
      setContent('');
      setFileIds([]);
      // Reset file upload component
      if (fileUploadRef.current) {
        fileUploadRef.current.reset();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        placeholder={isEditing ? 'Edit your comment...' : 'Add a comment...'}
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] resize-none"
        maxLength={5000}
        disabled={submitting}
      />

      {/* Character count */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>{content.length}/5000</span>
        {!isEditing && <span className="text-xs">Press Ctrl+Enter to send</span>}
      </div>

      {/* File upload for new comments only */}
      {!isEditing && (
        <CommentFileUpload
          ref={fileUploadRef} // Add ref
          taskId={taskId}
          onFilesChange={setFileIds}
          disabled={submitting}
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end">
        {(isEditing || content.trim().length > 0 || fileIds.length > 0) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={submitting}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          <Send className="w-4 h-4 mr-1" />
          {submitting ? 'Sending...' : isEditing ? 'Update' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
