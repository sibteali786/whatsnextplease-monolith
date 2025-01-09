const TaskAgent = ({
  activeTasks,
  incomingTasks,
}: {
  activeTasks: React.ReactNode;
  incomingTasks: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-rows-2 gap-6 p-4">
      {activeTasks}
      <div className="col-span-full">{incomingTasks}</div>
    </div>
  );
};
// INFO: Always set a valid height or width to loading / pae component otherwise it wont appear when screen loads up

export default TaskAgent;
