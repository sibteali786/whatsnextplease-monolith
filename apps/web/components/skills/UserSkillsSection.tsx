'use client';

import { useEffect, useState } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { CheckCircle, CircleX, Loader2 } from 'lucide-react';
import { SkillType } from '@/types';

interface Skill {
  id: string;
  name: string;
  description?: string;
  skillCategory: {
    categoryName: string;
  };
}

interface UserSkillsSectionProps {
  userId: string;
}

export function UserSkillsSection({ userId }: UserSkillsSectionProps) {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const groupSkillsByCategory = (skills: Skill[]) => {
    const grouped = skills.reduce(
      (acc, skill) => {
        const categoryName = skill.skillCategory.categoryName;
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push({
          label: skill.name,
          value: skill.name,
          description: skill.description, // 👈 tooltip text
        });
        return acc;
      },
      {} as Record<string, { label: string; value: string; description?: string }[]>
    );

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [skillsResponse, userSkillsResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/all`, {
            headers: {
              Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/skills/${userId}`, {
            headers: {
              Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (skillsResponse.ok) {
          const skillsData = await skillsResponse.json();
          setAllSkills(skillsData);
        }

        if (userSkillsResponse.ok) {
          const { success, skills } = await userSkillsResponse.json();
          if (success) {
            if (skills.length === 0) {
              setUserSkills([]);
              setSelectedSkills([]);
              return;
            }
            const skillNames = skills.map((skill: SkillType) => skill?.name) || [];
            setUserSkills(skillNames);
            setSelectedSkills(skillNames);
          }
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
        toast({
          variant: 'destructive',
          title: 'Error loading skills',
          description: 'Failed to load skills data',
          icon: <CircleX size={40} />,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/user/assign`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skillNames: selectedSkills }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUserSkills(selectedSkills);
        toast({
          title: 'Skills Updated',
          description: 'Your skills have been updated successfully',
          variant: 'success',
          icon: <CheckCircle size={40} />,
        });
      } else {
        throw new Error(data.message || 'Failed to update skills');
      }
    } catch (error) {
      console.error('Error updating skills:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update skills',
        icon: <CircleX size={40} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(userSkills.sort()) !== JSON.stringify(selectedSkills.sort());

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select the skills that best represent your expertise and capabilities.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <MultiSelect
          options={groupSkillsByCategory(allSkills)}
          onValueChange={setSelectedSkills}
          defaultValue={selectedSkills}
          enableOptionTooltip
          placeholder="Select your skills"
          maxCount={10}
        />

        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Skills'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
