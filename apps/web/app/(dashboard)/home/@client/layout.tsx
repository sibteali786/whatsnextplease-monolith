const ClientLayout = ({
  taskSummary,
  recentTasks,
}: {
  taskSummary: React.ReactNode;
  recentTasks: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-rows-2 gap-6 p-4">
      {taskSummary}
      <div className="col-span-full">{recentTasks}</div>
    </div>
  );
};

export default ClientLayout;
