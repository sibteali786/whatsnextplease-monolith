// components/users/UserSkillsList.tsx
'use client';

import { useEffect, useState } from 'react';
import { DynamicIcon } from '@/utils/Icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAllSkills, fetchUserSkills } from '@/actions/skillsActions';
import { Skeleton } from '@/components/ui/skeleton';

// Map skill names to corresponding icons
const skillIconMap: Record<string, string> = {
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
};

interface Skill {
  id: string;
  name: string;
  description: string | null;
  skillCategory: {
    categoryName: string;
  };
}

interface UserSkill {
  id: string;
  name: string;
  description: string | null;
  categoryName: string;
}

export default function UserSkillsList({ userId }: { userId: string }) {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSkillsData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch both all skills and user skills in parallel
        const [allSkillsResponse, userSkillsResponse] = await Promise.all([
          fetchAllSkills(),
          fetchUserSkills(userId),
        ]);

        if (!allSkillsResponse.success) {
          throw new Error(allSkillsResponse.error || 'Failed to fetch all skills');
        }

        if (!userSkillsResponse.success) {
          throw new Error(userSkillsResponse.error || 'Failed to fetch user skills');
        }

        setAllSkills(allSkillsResponse.skills);
        setUserSkills(userSkillsResponse.skills || []);
      } catch (error) {
        console.error('Error loading skills data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load skills');
      } finally {
        setLoading(false);
      }
    };

    loadSkillsData();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Skills</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <Card key={index} className="p-4">
              <CardHeader className="flex flex-col items-center">
                <Skeleton className="h-10 w-10 mb-2 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Skills</h1>
        <div className="text-center text-destructive">
          <p>Error loading skills: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Convert userSkills to a set for easier lookups
  const userSkillIds = new Set(userSkills.map(skill => skill.id));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Skills</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {allSkills.map(skill => (
          <Tooltip key={skill.id}>
            <TooltipTrigger asChild>
              <Card
                className={`p-4 cursor-pointer transition duration-150 ease-in-out ${
                  userSkillIds.has(skill.id) ? 'bg-primary text-white' : 'hover:bg-purple-100'
                }`}
              >
                <CardHeader className="flex flex-col items-center">
                  <DynamicIcon
                    name={skillIconMap[skill.name] || 'Circle'}
                    className={`h-10 w-10 mb-2 ${
                      userSkillIds.has(skill.id) ? 'text-white' : 'text-primary'
                    }`}
                  />
                  <CardTitle className="text-sm font-medium text-center">{skill.name}</CardTitle>
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
        ))}
      </div>
    </div>
  );
}
