'use client';

import { ReactNode, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Alert from '@/components/ui/alert-custom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

interface ModalWithConfirmationProps {
  open: boolean;
  title: string;
  onCloseRequest: () => void; // Called when user attempts to close (to show alert)
  onConfirmClose: () => Promise<void>; // Called when user confirms closing
  onSubmit?: () => void; // Optional: if you want a submit button in the footer
  submitButtonLabel?: string;
  showResetButton?: boolean; // Whether to show reset button
  onReset?: () => void; // Called when reset button is clicked
  children: ReactNode;
}

const ModalWithConfirmation: React.FC<ModalWithConfirmationProps> = ({
  open,
  title,
  onCloseRequest,
  onConfirmClose,
  onSubmit,
  submitButtonLabel = 'Submit',
  showResetButton = false,
  onReset,
  children,
}) => {
  const [alertOpen, setAlertOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleModalClose = () => {
    onCloseRequest(); // Let parent know we're trying to close
    // Trigger showing the confirmation alert
    setAlertOpen(true);
  };

  const confirmClose = async () => {
    await onConfirmClose();
    setAlertOpen(false);
  };

  const handleResetClick = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmReset = () => {
    if (onReset) {
      onReset();
    }
    setIsResetConfirmOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-[700px] max-h-[98%] overflow-hidden px-0">
          <DialogHeader className="px-6 flex flex-row gap-2 items-center">
            <ArrowLeft onClick={handleModalClose} className="w-4 h-4 cursor-pointer mt-2" />
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
          <DialogFooter className="px-6">
            {onSubmit && (
              <div className="flex justify-between w-full">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleModalClose}>
                    Cancel
                  </Button>
                  {showResetButton && onReset && (
                    <Button
                      variant="ghost"
                      onClick={handleResetClick}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset Form
                    </Button>
                  )}
                </div>
                <Button type="button" onClick={onSubmit}>
                  {submitButtonLabel}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close confirmation alert */}
      <Alert
        title="Are you sure you want to close?"
        description="Your changes will be saved as a draft and you can continue later."
        confirmAction={confirmClose}
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
      />

      {/* Reset confirmation alert */}
      <Alert
        title="Reset Form"
        description="Are you sure you want to clear all form fields? This action cannot be undone."
        confirmAction={confirmReset}
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </>
  );
};

export default ModalWithConfirmation;
