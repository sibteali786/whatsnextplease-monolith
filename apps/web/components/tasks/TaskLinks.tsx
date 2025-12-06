'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { taskLinkAPI } from '@/utils/tasks/taskLinkAPI';
import { TaskLink } from '@/types/tasks';
import AddLinkForm from './AddLinkForm';
import LinkCard from './LinkCard';

interface TaskLinksProps {
  taskId: string;
}

export default function TaskLinks({ taskId }: TaskLinksProps) {
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadLinks = async () => {
    try {
      setLoading(true);
      const result = await taskLinkAPI.getTaskLinks(taskId);

      if (result.success) {
        setLinks(result.links || []);
      } else {
        toast({
          title: 'Failed to load links',
          description: result.message || 'Could not fetch task links',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading links:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load links',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      loadLinks();
    }
  }, [taskId]);

  const handleLinkAdded = (newLink: TaskLink) => {
    setLinks(prev => [newLink, ...prev]);
    setShowAddForm(false);
    toast({
      title: 'Link Added',
      description: 'The link has been added successfully',
      variant: 'success',
    });
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      setDeletingId(linkId);
      const result = await taskLinkAPI.deleteTaskLink(taskId, linkId);

      if (result.success) {
        setLinks(prev => prev.filter(link => link.id !== linkId));
        toast({
          title: 'Link Deleted',
          description: 'The link has been removed',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Delete Failed',
          description: result.message || 'Could not delete link',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete link',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const scrollToComment = (commentId: string) => {
    const commentElement = document.getElementById(`comment-${commentId}`);

    if (commentElement) {
      // Switch to comments tab first
      const commentsTab = document.querySelector('[value="comments"]') as HTMLElement;
      if (commentsTab) {
        commentsTab.click();
      }

      // Then scroll after a brief delay to allow tab switch
      setTimeout(() => {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the comment temporarily
        commentElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          commentElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }, 300);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Links ({links.length})</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? 'outline' : 'default'}
        >
          <Plus className="w-4 h-4 mr-1" />
          {showAddForm ? 'Cancel' : 'Add Link'}
        </Button>
      </div>

      {/* Add Link Form */}
      {showAddForm && (
        <AddLinkForm
          taskId={taskId}
          onLinkAdded={handleLinkAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Links List */}
      {links.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <ExternalLink className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">
            No links yet. Add a link or paste URLs in comments to automatically track them here.
          </p>
          <p className="text-xs text-muted-foreground">
            Any URLs you paste in comments will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <LinkCard
              key={link.id}
              link={link}
              onDelete={handleDelete}
              onViewComment={scrollToComment}
              isDeleting={deletingId === link.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
