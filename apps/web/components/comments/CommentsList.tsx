'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, ChevronDown } from 'lucide-react';
import { Comment } from '@/utils/commentSchemas';
import { getComments } from '@/actions/commentActions';
import CommentItem from './CommentItem';
import { useToast } from '@/hooks/use-toast';

interface CommentsListProps {
  taskId: string;
  comments: Comment[];
  onCommentsUpdate: (comments: Comment[]) => void;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export default function CommentsList({
  taskId,
  comments,
  onCommentsUpdate,
  totalCount,
  hasMore,
  nextCursor,
}: CommentsListProps) {
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);

    try {
      const result = await getComments(taskId, nextCursor, 20);

      if (result.success && result.comments) {
        onCommentsUpdate([...comments, ...result.comments]);
      } else {
        toast({
          title: 'Load Failed',
          description: result.error || 'Failed to load more comments',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while loading comments' + error,
        variant: 'destructive',
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCommentUpdated = (updatedComment: Comment) => {
    onCommentsUpdate(
      comments.map(comment => (comment.id === updatedComment.id ? updatedComment : comment))
    );
  };

  const handleCommentDeleted = (commentId: string) => {
    onCommentsUpdate(comments.filter(comment => comment.id !== commentId));
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageCircle className="w-4 h-4" />
        <span>
          {totalCount} comment{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onCommentUpdated={handleCommentUpdated}
            onCommentDeleted={handleCommentDeleted}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Load More Comments
              </>
            )}
          </Button>
        </div>
      )}

      {/* Loading skeleton for more comments */}
      {loadingMore && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 p-4 rounded-lg border">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
