// Replace the entire file content
'use client';

import { useEffect, useState } from 'react';
import { SkillsList } from '@/components/skills/SkillsList';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { Skeleton } from '@/components/ui/skeleton';

type SkillData = {
  id: string;
  categoryName: string;
  skills: {
    id: string;
    name: string;
    description: string | null;
  }[];
};

export default function Skills() {
  const [data, setData] = useState<SkillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchSkills = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/all`, {
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }

      const skillsData = await response.json();
      console.log('Fetched skills data:', skillsData);
      setData(skillsData);
    } catch (err) {
      console.error('Error fetching skills:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  if (loading) {
    return <SkillsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold text-destructive">Error Loading Skills</h2>
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <SkillsList data={data} onSuccess={fetchSkills} />;
}

function SkillsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, categoryIndex) => (
        <div key={categoryIndex} className="mb-8">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, skillIndex) => (
              <div key={skillIndex} className="rounded-2xl border p-4">
                <div className="flex flex-col items-center space-y-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
