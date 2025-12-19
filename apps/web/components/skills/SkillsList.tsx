// app/skills/page.tsx

import { SkillCategoryEditForm } from '../picklists/SkillCategoryEditForm';
import { SkillEditForm } from './SkillEditForm';
// Icons map for different skill categories
export const skillIconMap: Record<string, string> = {
  'Web Development': 'Globe',
  'Frontend Development': 'LayoutGrid',
  'Backend Development': 'Server',
  'Mobile App Development': 'Smartphone',
  'Product Management': 'Package',
  'UI/UX Design': 'PenTool',
  'Agile Methodologies': 'Repeat',
  'Digital Marketing': 'ChartBar',
  'Sales Strategy': 'TrendingUp',
  'Lead Generation': 'UserPlus',
  'Social Media Marketing': 'MessageCircle',
  Accounting: 'FileText',
  'Financial Analysis': 'DollarSign',
  'Tax Planning': 'FileText',
  'Budget Management': 'ChartPie',
  'Customer Support': 'Headphones',
  'Technical Support': 'Wrench',
  Troubleshooting: 'TriangleAlert',
  'Project Management': 'Clipboard',
  'Business Development': 'Briefcase',
  Development: 'Code',
  'Sales & Marketing': 'ChartNoAxesCombined',
  'Accounting & Finance': 'Calculator',
  Support: 'Headset',
};

export type SkillListProps = {
  data: {
    id: string;
    categoryName: string;
    skills: {
      id: string;
      name: string;
      description: string | null;
    }[];
  }[];
  onSuccess: () => void;
};
export const SkillsList: React.FC<SkillListProps> = ({ data, onSuccess }) => {
  return (
    <>
      {data?.map(category => (
        <div key={category.id} className="mb-8">
          <SkillCategoryEditForm
            dropdownItem={false}
            categoryName={category.categoryName}
            id={category.id}
            onSuccess={onSuccess}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {category.skills.map(skill => (
              <SkillEditForm
                key={skill.id}
                selectedCategory={{
                  id: category.id,
                  categoryName: category.categoryName,
                  skillsDescription: skill.description || '',
                }}
                skill={skill}
                onSuccess={onSuccess}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};
