-- DropForeignKey
ALTER TABLE "TaskSkill" DROP CONSTRAINT "TaskSkill_skillId_fkey";

-- DropForeignKey
ALTER TABLE "TaskSkill" DROP CONSTRAINT "TaskSkill_taskId_fkey";

-- AddForeignKey
ALTER TABLE "TaskSkill" ADD CONSTRAINT "TaskSkill_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSkill" ADD CONSTRAINT "TaskSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
