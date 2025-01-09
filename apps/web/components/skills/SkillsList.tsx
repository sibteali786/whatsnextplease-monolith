// app/skills/page.tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DynamicIcon } from "@/utils/Icon";
// Icons map for different skill categories
export const skillIconMap: Record<string, string> = {
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
  Development: "Code",
  "Sales & Marketing": "ChartNoAxesCombined",
  "Accounting & Finance": "Calculator",
  Support: "Headset",
};

export type SkillListProps = {
  data: {
    categoryName: string;
    skills: {
      id: string;
      name: string;
      description: string | null;
    }[];
  }[];
};
export const SkillsList: React.FC<SkillListProps> = ({ data }) => {
  return (
    <>
      {data?.map((category) => (
        <div key={category.categoryName} className="mb-8">
          <h2 className="text-lg font-semibold text-purple-600 mb-4">
            {category.categoryName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {category.skills.map((skill) => (
              <Card
                key={skill.id}
                className="rounded-2xl shadow-sm flex justify-center items-center "
              >
                <CardHeader className="flex flex-col items-center">
                  <DynamicIcon
                    name={skillIconMap[skill.name] || "Circle"}
                    className="h-10 w-10 text-purple-600 mb-2"
                  />
                  <CardTitle className="text-sm font-medium text-center">
                    {skill.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-center text-gray-500">
                    {skill.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
