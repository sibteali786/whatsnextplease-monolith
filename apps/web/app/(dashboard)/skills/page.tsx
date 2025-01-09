// Assuming you have an icon utility for mapping icons
import { SkillsList } from "@/components/skills/SkillsList";
import { getSkills } from "@/db/repositories/skills/getSkills";

export default async function Skills() {
  const data = await getSkills();
  return (
    <>
      <SkillsList data={data} />
    </>
  );
}
