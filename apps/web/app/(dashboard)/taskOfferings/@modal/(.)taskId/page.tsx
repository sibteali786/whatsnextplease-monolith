'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TaskDetailsView from '@/components/tasks/TaskDetailsView';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface ModalTaskDetailsProps {
  params: {
    taskId: string;
  };
}

export default function ModalTaskDetails({ params }: ModalTaskDetailsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  // Handle dialog close - navigate back
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      router.back();
    }
  };

  // Ensure dialog opens when component mounts
  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[80%] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="sr-only">Task Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0">
          <TaskDetailsView
            taskId={params.taskId}
            showBackButton={false}
            onBack={() => router.back()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
