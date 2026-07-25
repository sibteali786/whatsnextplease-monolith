import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CallToAction } from '@/components/CallToAction';
import { LinkButton } from '@/components/ui/LinkButton';
import { ClipboardList, PlusCircle } from 'lucide-react';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { USER_CREATED_TASKS_CONTEXT } from '@/utils/commonUtils/taskPermissions';
import { DurationEnum } from '@/types';
import { taskApiServer } from '@/actions/taskActions';
import { TaskByUserIdResponse } from '@/utils/validationSchemas';

import RecentTasksTable from './task-table';

const RecentTasksPage = async () => {
  const user = await getCurrentUser();

  if (user?.role?.name !== Roles.CLIENT) {
    return null;
  }

  const { data }: TaskByUserIdResponse = await taskApiServer.getTasksByUserId({
    userId: user.id,
    pageSize: 5,
    search: '',
    duration: DurationEnum.ALL,
    context: USER_CREATED_TASKS_CONTEXT.GENERAL,
  });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Recent Tasks
        </CardTitle>
      </CardHeader>

      <CardContent>
        {(data?.length ?? 0) === 0 ? (
          <CallToAction
            title="No tasks found"
            link="#"
            description="Tasks assigned to you by your team will appear here."
            action={undefined}
            helperText="You don't have any assigned tasks yet."
            variant="primary"
            iconType="plus"
            className="my-6"
          />
        ) : (
          <RecentTasksTable tasks={data ?? []} />
        )}
      </CardContent>

      {(data?.length ?? 0) > 0 && (
        <CardFooter className="pt-1 pb-4 flex justify-end">
          <LinkButton
            href="/taskOfferings"
            className="flex items-center gap-1"
            prefetch
            variant="outline"
            size="sm"
          >
            <span>View All Tasks</span>
            <PlusCircle className="h-4 w-4 ml-1" />
          </LinkButton>
        </CardFooter>
      )}
    </Card>
  );
};

export default RecentTasksPage;
