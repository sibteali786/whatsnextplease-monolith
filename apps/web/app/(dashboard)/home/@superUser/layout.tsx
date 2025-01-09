const SuperUser = ({
  activeclients,
  messages,
  tasks,
}: {
  children: React.ReactNode;
  activeclients: React.ReactNode;
  messages: React.ReactNode;
  tasks: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-rows-2 gap-6 p-4">
      <div className="col-span-2">{activeclients}</div>
      <div className="col-span-2">{messages}</div>
      <div className="col-span-full">{tasks}</div>
    </div>
  );
};

export default SuperUser;
