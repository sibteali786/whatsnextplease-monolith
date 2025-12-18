'use client';

import { EditSkillForm } from '@/components/picklists/EditSkillForm';
import { SkillCategoryEditForm } from '@/components/picklists/SkillCategoryEditForm';
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
import { SkillCategories, SkillCategoryState } from '@wnp/types';
import { ClipboardCopy, MoreHorizontal, Plus } from 'lucide-react';

export const generateSkillCategoryColumns = (
  setOpenAddSkillDialog: (open: boolean) => void,
  setSelectedSkillCategory: (skillCategory: SkillCategoryState) => void,
  fetchDetails: () => Promise<void>
): ColumnDef<SkillCategories>[] => {
  return [
    {
      accessorKey: 'categoryName',
      header: 'Category Name',
    },
    {
      accessorKey: 'skills',
      header: 'Skills',
      cell: ({ row }) => {
        const skills = row.original.skills;

        const skillCategory = row.original;
        const skillCategoryWithoutSkills = { ...skillCategory, skills: [] };
        console.log('Skills in cell:', skills);
        return (
          <div className={`flex ${skills.length > 2 ? 'flex-wrap' : ''} gap-2 items-center`}>
            {skills.map((skill, index) => (
              <EditSkillForm
                key={index}
                skill={skill}
                onSuccess={fetchDetails}
                skillCategory={skillCategoryWithoutSkills}
              />
            ))}
          </div>
        );
      },
    },
    {
      id: 'id',
      cell: ({ row }) => {
        const skillCategory = row.original;
        const skillCategoryWithoutSkills = { ...skillCategory, skills: [] };
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
              <DropdownMenuItem
                onClick={() => {
                  setOpenAddSkillDialog(true);
                  setSelectedSkillCategory(skillCategoryWithoutSkills);
                }}
              >
                <Plus className="w-3 h-3" /> Add New Skill
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <SkillCategoryEditForm
                  dropdownItem={true}
                  categoryName={skillCategory.categoryName}
                  id={skillCategory.id}
                  onSuccess={fetchDetails}
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
