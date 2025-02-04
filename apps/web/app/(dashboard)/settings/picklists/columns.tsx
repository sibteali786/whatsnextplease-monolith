'use client';

import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';

export type Skills = {
  name: string;
  description: string;
};

export type SkillCategories = {
  categoryName: string | null;
  skills: Array<Skills>;
  id: string;
};

export const columns: ColumnDef<SkillCategories>[] = [
  {
    accessorKey: 'categoryName',
    header: 'Category Name',
  },
  {
    accessorKey: 'skills',
    header: 'Skills',
    cell: ({ row }) => {
      const skills = row.original.skills;
      return (
        <div className={`flex ${skills.length > 2 ? 'flex-wrap' : ''} gap-2 items-center`}>
          {skills.map((skill, index) => (
            <Badge key={index} className="py-1 px-4 text-[10px] text-nowrap">
              {skill.name}
            </Badge>
          ))}
        </div>
      );
    },
  },
];
