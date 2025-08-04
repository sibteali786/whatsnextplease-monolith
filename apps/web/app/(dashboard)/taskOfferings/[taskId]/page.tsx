// app/taskOfferings/[taskId]/page.tsx
import { notFound } from 'next/navigation';
import { getTaskById } from '@/db/repositories/tasks/getTaskById';
import TaskDetailsView from '@/components/tasks/TaskDetailsView';

interface TaskDetailsPageProps {
  params: {
    taskId: string;
  };
}

export default async function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const { taskId } = params;

  if (!taskId) {
    notFound();
  }

  const { success, task } = await getTaskById(taskId);

  if (!success || !task) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <TaskDetailsView taskId={taskId} task={task} />
    </div>
  );
}
