import { DynamicTabs, Tab } from "@/components/clients/ClientTabs";
import { DetailsCard } from "@/components/common/DetailsCard";
import UserFileList from "@/components/users/UserFileList";
import UserSkillsList from "@/components/users/UserSkillsList";
import UserTaskList from "@/components/users/UserTaskList";
import { getUserById } from "@/utils/userTools";

const UserProfile = async ({ params }: { params: { userId: string } }) => {
  const userTabs: Tab[] = [
    {
      tabName: "Tasks",
      tabValue: "tasks",
      tabContent: <UserTaskList userId={params.userId} />,
    },
    {
      tabName: "Schedule",
      tabValue: "schedule",
      tabContent: <div>Schedule</div>,
    },
    {
      tabName: "Skills",
      tabValue: "skills",
      tabContent: <UserSkillsList userId={params.userId} />,
    },
    {
      tabName: "Files",
      tabValue: "files",
      tabContent: <UserFileList userId={params.userId} />,
    },
  ];

  const { user, message } = await getUserById(params.userId);

  return (
    <div className="flex flex-col gap-7">
      {user ? (
        <DetailsCard
          title={`${user.firstName} ${user.lastName}`}
          subTitle={user.designation || ""}
          avatarUrl={user.avatarUrl}
          leftFields={[
            { label: "Phone", value: user.phone },
            { label: "Email", value: user.email },
            { label: "City", value: user.city },
            { label: "State", value: user.state },
            { label: "Zip Code", value: user.zipCode },
          ]}
          rightFields={[{ label: "Address 1", value: user.address }]}
        />
      ) : (
        <p className="text-red-500">Error: {message}</p>
      )}
      <DynamicTabs tabs={userTabs} defaultValue="tasks" />
    </div>
  );
};

export default UserProfile;
