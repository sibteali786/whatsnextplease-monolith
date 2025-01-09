import { ReactNode } from "react";
import { getCategoriesWithSkills } from "@/db/repositories/skills/getSkillsWithCategories";
import { AddSkillDialog } from "@/components/skills/AddSkillDialog";

const UsersLayout = async ({ children }: { children: ReactNode }) => {
  const skills = await getCategoriesWithSkills();
  return (
    <>
      <div className="flex flex-row justify-between mb-5">
        <h2 className="text-2xl font-bold">Skills</h2>
        <AddSkillDialog skills={skills} />
      </div>
      {children}
    </>
  );
};

export default UsersLayout;
