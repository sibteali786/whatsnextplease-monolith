'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { ClipboardCopy, MoreHorizontal, Plus } from 'lucide-react';

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
  {
    id: 'id',
    cell: ({ row }) => {
      const skillCategory = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(skillCategory.id)}>
              <ClipboardCopy className="w-3 h-3" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Plus className="w-3 h-3" /> Add New Skill
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
