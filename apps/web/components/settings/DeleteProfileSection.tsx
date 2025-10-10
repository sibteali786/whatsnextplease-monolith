'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteOwnProfile, EntityType } from '@/utils/entityActions';

interface DeleteProfileSectionProps {
  entityType: EntityType;
  entityId: string;
  confirmationText: string; // e.g., "John Doe" or "Acme Corp"
}

export function DeleteProfileSection({
  entityType,
  entityId,
  confirmationText,
}: DeleteProfileSectionProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const isConfirmationValid = confirmInput.trim() === confirmationText.trim();

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      toast({
        title: 'Confirmation Required',
        description: 'Please type the confirmation text exactly as shown',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOwnProfile(entityType, entityId);

      // The redirect happens in deleteOwnProfile, but show toast for good UX
      toast({
        title: 'Account Deleted',
        description: 'Your account has been permanently deleted',
        variant: 'success',
      });
    } catch (error) {
      setIsDeleting(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Once you delete your account, there is no going back. Please be certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Delete Your Account</p>
              <p className="text-sm text-muted-foreground">
                This will permanently delete your profile, remove all your data, and you will no
                longer be able to access this account. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="mt-2"
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <span className="font-semibold">cannot be undone</span>. This will
                permanently delete your account and remove all associated data from our servers.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Please type <span className="font-mono font-semibold">{confirmationText}</span> to
                  confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  placeholder={confirmationText}
                  disabled={isDeleting}
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={!isConfirmationValid || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete My Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
