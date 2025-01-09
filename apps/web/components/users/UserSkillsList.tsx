// app/skills/page.tsx

import { DynamicIcon } from "@/utils/Icon";
import { getSkills } from "@/utils/skillTools";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserSkills } from "@/utils/userTools";

// Map skill names to corresponding icons
const skillIconMap: Record<string, string> = {
  "Web Development": "Globe",
  "Frontend Development": "LayoutGrid",
  "Backend Development": "Server",
  "Mobile App Development": "Smartphone",
  "Product Management": "Package",
  "UI/UX Design": "PenTool",
  "Agile Methodologies": "Repeat",
  "Digital Marketing": "ChartBar",
  "Sales Strategy": "TrendingUp",
  "Lead Generation": "UserPlus",
  "Social Media Marketing": "MessageCircle",
  Accounting: "FileText",
  "Financial Analysis": "DollarSign",
  "Tax Planning": "FileText",
  "Budget Management": "ChartPie",
  "Customer Support": "Headphones",
  "Technical Support": "Wrench",
  Troubleshooting: "TriangleAlert",
  "Project Management": "Clipboard",
  "Business Development": "Briefcase",
};

export default async function UserSkillsList({ userId }: { userId: string }) {
  const allSkills = await getSkills();
  const { success, skills: userSkills, error } = await getUserSkills(userId);

  if (!success || userSkills === undefined) {
    return <div>Error loading skills: {error}</div>;
  }

  // Convert userSkills to a set for easier lookups
  const userSkillIds = new Set(userSkills.map((skill) => skill.id));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Skills</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {allSkills.map((skill) => (
          <TooltipProvider key={skill.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className={`p-4 cursor-pointer transition duration-150 ease-in-out ${
                    userSkillIds.has(skill.id)
                      ? "bg-primary text-white"
                      : "hover:bg-purple-100"
                  }`}
                >
                  <CardHeader className="flex flex-col items-center">
                    <DynamicIcon
                      name={skillIconMap[skill.name] || "Circle"}
                      className={`h-10 w-10 mb-2 ${
                        userSkillIds.has(skill.id)
                          ? "text-white"
                          : "text-primary"
                      }`}
                    />
                    <CardTitle className="text-sm font-medium text-center">
                      {skill.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <p className="font-semibold">{skill.name}</p>
                  <p className="text-xs text-gray-400">{skill.description}</p>
                  <p className="text-xs text-gray-400">
                    Category: {skill.skillCategory.categoryName}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
