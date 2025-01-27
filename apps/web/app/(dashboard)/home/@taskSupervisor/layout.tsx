const TaskSupervisorLayout = ({
  taskSummary,
  recentUnassignedTasks,
}: {
  taskSummary: React.ReactNode;
  recentUnassignedTasks: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-rows-2 gap-6 p-4">
      {taskSummary}
      <div className="col-span-full">{recentUnassignedTasks}</div>
    </div>
  );
};

export default TaskSupervisorLayout;
