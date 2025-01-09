import { getCurrentUser } from "@/utils/user";
import { Roles } from "@prisma/client";

export default async function DashboardLayout({
  superUser,
  taskAgent,
  client,
  taskSupervisor,
}: {
  superUser: React.ReactNode;
  taskAgent: React.ReactNode;
  client: React.ReactNode;
  taskSupervisor: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <div>
      <div>
        {user.role.name === Roles.TASK_SUPERVISOR ? taskSupervisor : null}
      </div>
      <div>{user.role.name === Roles.SUPER_USER ? superUser : null}</div>
      <div>{user.role.name === Roles.TASK_AGENT ? taskAgent : null}</div>
      <div>{user.role.name === Roles.CLIENT ? client : null}</div>
    </div>
  );
}
