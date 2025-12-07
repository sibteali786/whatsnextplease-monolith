'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { taskLinkAPI } from '@/utils/tasks/taskLinkAPI';
import { Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { TaskLink } from '@/types/tasks';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddLinkFormProps {
  taskId: string;
  onLinkAdded: (link: TaskLink) => void;
  onCancel: () => void;
}

export default function AddLinkForm({ taskId, onLinkAdded, onCancel }: AddLinkFormProps) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const isValidUrl = (str: string) => {
    try {
      const url = new URL(str);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUrl = url.trim();

    // Validation
    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setError('Please enter a valid http or https URL');
      return;
    }

    setSubmitting(true);

    try {
      const result = await taskLinkAPI.createTaskLink(taskId, trimmedUrl);

      if (result.success && result.link) {
        onLinkAdded(result.link);
        setUrl('');
        setError(null);
      } else {
        setError(result.message || 'Could not add link');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add link';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null); // Clear error on change
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/50 space-y-3">
      <div className="space-y-2">
        <Label htmlFor="link-url" className="text-sm font-medium">
          URL
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={handleUrlChange}
              disabled={submitting}
              className={`pl-9 ${error ? 'border-destructive' : ''}`}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-xs text-muted-foreground">
          Paste any http or https URL. We&apos;ll automatically fetch the page title and icon.
        </p>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting || !url.trim()}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Adding...
            </>
          ) : (
            'Add Link'
          )}
        </Button>
      </div>
    </form>
  );
}
