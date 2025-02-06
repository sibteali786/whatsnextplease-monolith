import { ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface DialogWrapperProps {
  open: boolean;
  onOpenChange: () => void;
  title: string;
  children: React.ReactNode;
}

export const DialogWrapper = ({ open, onOpenChange, title, children }: DialogWrapperProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[700px] max-h-[98%] overflow-hidden px-0">
      <DialogHeader className="px-6 flex flex-row gap-2 items-center">
        <ArrowLeft onClick={onOpenChange} className="w-4 h-4 cursor-pointer mt-2" />
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);
