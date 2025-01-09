import { CountLabel } from "@/components/common/CountLabel";
import { TaskAgentChart } from "@/components/tasks/ChartTasks";
import { Card } from "@/components/ui/card";
import { getTasksCountByStatus } from "@/db/repositories/tasks/getTasksCountByStatus";
import { getCurrentUser } from "@/utils/user";
import { Roles } from "@prisma/client";
import { CircleX } from "lucide-react";

const TaskSummaryPage = async () => {
  const user = await getCurrentUser();
  if (user.role.name !== Roles.CLIENT) {
    return null;
  }
  const { tasksWithStatus, success } = await getTasksCountByStatus(
    user.id,
    Roles.CLIENT,
  );
  return (
    <div className="col-span-2">
      <Card className="p-6 rounded-2xl shadow-m flex">
        {success ? (
          <div className="space-y-7 w-full">
            <h2 className="font-bold text-2xl">Progress</h2>
            <div className="w-full flex flex-col gap-4">
              <CountLabel
                lineHeight={"normal"}
                label={"In-Progress Tasks"}
                count={tasksWithStatus.IN_PROGRESS ?? 0}
                align="start"
                isList={true}
                listOpacity={70}
                countSize="text-7xl"
              />
              <CountLabel
                lineHeight={"normal"}
                label={"Completed Tasks"}
                count={tasksWithStatus.COMPLETED ?? 0}
                align="start"
                isList={true}
                listOpacity={80}
                countSize="text-5xl"
                labelSize="lg"
              />
              <CountLabel
                lineHeight={"normal"}
                label={"Overdue Tasks"}
                count={tasksWithStatus.OVERDUE ?? 0}
                align="start"
                isList={true}
                listOpacity={80}
                countSize="text-3xl"
                labelSize="lg"
                countColor="red-500"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center">
            <CircleX color="red" className="w-10 h-10" />
            <p className="text-destructive text-lg text-center">
              Something is wrong at backend{" "}
            </p>
          </div>
        )}
        <TaskAgentChart />
      </Card>
    </div>
  );
};
export default TaskSummaryPage;
