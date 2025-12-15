// Replace entire file content
'use client';

import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { AddSkillDialog } from '@/components/skills/AddSkillDialog';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

interface SkillCategory {
  id: string;
  categoryName: string;
  skillsDescription: string;
}

const SkillsLayout = ({ children }: { children: ReactNode }) => {
  const [skills, setSkills] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchSkills = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/search`, {
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const skillsData = await response.json();
        setSkills(skillsData);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);
  const handleSkillAdded = useCallback(() => {
    console.log('Skill added, refreshing skills list');
    setRefreshKey(prev => prev + 1); // This will force re-render of children
    fetchSkills();
  }, []);
  return (
    <>
      <div className="flex flex-row justify-between mb-5">
        <h2 className="text-2xl font-bold">Skills</h2>
        {!loading && <AddSkillDialog skills={skills} onSkillAdded={handleSkillAdded} />}
      </div>
      <div key={refreshKey} className="pb-5">
        {children}
      </div>
    </>
  );
};

export default SkillsLayout;
