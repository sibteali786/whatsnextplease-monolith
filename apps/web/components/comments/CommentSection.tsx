'use client';

import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Comment } from '@/utils/commentSchemas';
import { getComments } from '@/actions/commentActions';
import CommentForm from './CommentForm';
import CommentsList from './CommentsList';
import { useToast } from '@/hooks/use-toast';
import { handleCommentFragment } from '@/utils/commentNavigation';

interface CommentSectionProps {
  taskId: string;
  onDataChange?: () => void;
  key?: number;
}

export default function CommentSection({ taskId, onDataChange, key }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadComments = async (cursor?: string) => {
    try {
      setLoading(true);
      const result = await getComments(taskId, cursor, 20);

      if (result.success) {
        setComments(result.comments || []);
        setTotalCount(result.totalCount || 0);
        setHasMore(result.hasNextCursor || false);
        setNextCursor(result.nextCursor || null);
      } else {
        toast({
          title: 'Load Failed',
          description: result.error || 'Failed to load comments',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          'An error occurred while loading comments: ' +
          (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadComments();
    }
  }, [taskId]);

  const handleCommentAdded = (newComment: Comment) => {
    // Add new comment to the beginning of the list
    setComments(prev => [newComment, ...prev]);
    setTotalCount(prev => prev + 1);

    if (newComment.commentFiles.length > 0 && onDataChange) {
      onDataChange();
    }
  };

  const handleCommentsUpdate = (updatedComments: Comment[]) => {
    setComments(updatedComments);
    setTotalCount(updatedComments.length);
    setHasMore(false); // Reset pagination when comments are updated
    setNextCursor(null);

    if (onDataChange) {
      onDataChange();
    }
  };
  useEffect(() => {
    if (key && key > 0) {
      loadComments();
    }
  }, [key]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      handleCommentFragment();
    }
  }, [comments]);
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Comments</h3>
        </div>

        {/* Loading skeleton */}
        <div className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>

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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Comments</h3>
      </div>

      {/* Comment form */}
      <CommentForm taskId={taskId} onCommentAdded={handleCommentAdded} />

      {/* Comments list */}
      {totalCount > 0 && (
        <>
          <Separator />
          <CommentsList
            taskId={taskId}
            comments={comments}
            onCommentsUpdate={handleCommentsUpdate}
            totalCount={totalCount}
            hasMore={hasMore}
            nextCursor={nextCursor}
            onDataChange={onDataChange}
          />
        </>
      )}
    </div>
  );
}
