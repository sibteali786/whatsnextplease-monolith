'use client';

import TaskViewFilterComponent from '@/components/TaskViewFilter';
import { getCurrentUser, UserState } from '@/utils/user';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Gantt from './gantt';
import Kanban from './kanban';

const ProjectTimeline = () => {
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<UserState | null>(null);

  const view = (searchParams.get('view') as 'timeline' | 'kanban') ?? 'kanban';

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const loggedInUser = await getCurrentUser();
      setCurrentUser(loggedInUser);
    };
    fetchCurrentUser();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-4">
      <div className="flex flex-col lg:flex-row gap-4 justify-between ">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold ">Project Timeline</h1>
          <p className="opacity-70">Manage tasks and track progress visually.</p>
        </div>
        <TaskViewFilterComponent role={currentUser?.role?.name} />
      </div>
      {view === 'timeline' ? <Gantt user={currentUser} /> : <Kanban user={currentUser} />}
    </div>
  );
};

export default ProjectTimeline;
