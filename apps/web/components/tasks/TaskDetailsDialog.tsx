'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TaskDetailsView from './TaskDetailsView';

export default function TaskDetailsDialog({
  open,
  taskId,
  setOpen,
}: {
  open: boolean;
  taskId: string;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[80%] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="sr-only">Task Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0">
          <TaskDetailsView taskId={taskId} showBackButton={false} onBack={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
