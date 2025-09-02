const TaskAgent = ({
  activeTasks,
  incomingTasks,
  messages,
}: {
  activeTasks: React.ReactNode;
  incomingTasks: React.ReactNode;
  messages: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-rows-2 gap-6 p-4">
      <div className="col-span-2">{activeTasks}</div>
      <div className="col-span-2">{messages}</div>
      <div className="col-span-full">{incomingTasks}</div>
    </div>
  );
};
// INFO: Always set a valid height or width to loading / pae component otherwise it wont appear when screen loads up

export default TaskAgent;
