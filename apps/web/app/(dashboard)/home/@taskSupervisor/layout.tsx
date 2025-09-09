const TaskSupervisorLayout = ({
  taskSummary,
  recentUnassignedTasks,
  messages,
}: {
  taskSummary: React.ReactNode;
  recentUnassignedTasks: React.ReactNode;
  messages: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-rows-2 gap-6 p-4">
      <div className="col-span-2">{taskSummary}</div>
      <div className="col-span-2">{messages}</div>
      <div className="col-span-full">{recentUnassignedTasks}</div>
    </div>
  );
};

export default TaskSupervisorLayout;
