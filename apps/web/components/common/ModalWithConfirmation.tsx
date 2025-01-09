"use client";

import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Alert from "@/components/ui/alert-custom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";

interface ModalWithConfirmationProps {
  open: boolean;
  title: string;
  onCloseRequest: () => void; // Called when user attempts to close (to show alert)
  onConfirmClose: () => Promise<void>; // Called when user confirms closing
  onSubmit?: () => void; // Optional: if you want a submit button in the footer
  submitButtonLabel?: string;
  children: ReactNode;
}

const ModalWithConfirmation: React.FC<ModalWithConfirmationProps> = ({
  open,
  title,
  onCloseRequest,
  onConfirmClose,
  onSubmit,
  submitButtonLabel = "Submit",
  children,
}) => {
  const [alertOpen, setAlertOpen] = useState(false);

  const handleModalClose = () => {
    //
    onCloseRequest(); // mock call just to avoid TS error :>
    // Trigger showing the confirmation alert
    setAlertOpen(true);
  };

  const confirmClose = async () => {
    await onConfirmClose();
    setAlertOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-[700px] max-h-[98%] overflow-hidden px-0">
          <DialogHeader className="px-6 flex flex-row gap-2 items-center">
            <ArrowLeft
              onClick={handleModalClose}
              className="w-4 h-4 cursor-pointer mt-2"
            />
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
          <DialogFooter className="px-6">
            {onSubmit && (
              <div className="flex flex-row gap-4 items-center">
                <Button variant="outline" onClick={handleModalClose}>
                  Cancel
                </Button>
                <Button type="submit" onClick={onSubmit}>
                  {submitButtonLabel}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Alert
        title="Are you sure you want to close?"
        description="Closing this modal will discard all unsaved changes."
        confirmAction={confirmClose}
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
      />
    </>
  );
};

export default ModalWithConfirmation;
