import { useToast } from '@/hooks/use-toast';
import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';
import { ErrorResponse, SkillCategoryCreateSchema, SkillCreateSchema } from '@wnp/types';
import { useState } from 'react';
import { z } from 'zod';
import { DialogWrapper } from './DialogWrapper';
import { SkillCategoryCreateForm } from './SkillCategoryCreateForm';
import { TaskCategoryForm } from './TaskCategoryCreateForm';
import { AddNewSkillForm } from './AddNewSkillForm';
import { Skill } from '@prisma/client';
import { useSelectedSkillCategory } from '@/store/useSkillCategoryStore';

interface PicklistContainerProps {
  openSkillDialog: boolean;
  setOpenSkillDialog: (open: boolean) => void;
  openTaskDialog: boolean;
  setOpenTaskDialog: (open: boolean) => void;
  openAddSkillDialog: boolean;
  setOpenAddSkillDialog: (open: boolean) => void;
  onSuccess: () => Promise<void>;
}

export const PicklistContainer = ({
  openSkillDialog,
  setOpenSkillDialog,
  openTaskDialog,
  setOpenTaskDialog,
  openAddSkillDialog,
  setOpenAddSkillDialog,
  onSuccess,
}: PicklistContainerProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { selectedSkillCategory } = useSelectedSkillCategory();

  const handleSkillSubmit = async (data: z.infer<typeof SkillCategoryCreateSchema>) => {
    setIsSubmitting(true);
    const token = getCookie(COOKIE_NAME);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const createdSkill = await response.json();
      if (createdSkill) {
        toast({
          title: 'Skill Category Added',
          description: `Skill category ${createdSkill.categoryName} has been added successfully`,
          variant: 'success',
        });
        setOpenSkillDialog(false);
        await onSuccess(); // Refresh the data
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
    setIsSubmitting(false);
  };

  const handleTaskSubmit = async (data: z.infer<typeof SkillCategoryCreateSchema>) => {
    setIsSubmitting(true);
    const token = getCookie(COOKIE_NAME);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskCategory/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const createdTask = await response.json();
      if (createdTask) {
        toast({
          title: 'Task Category Added',
          description: `Task category ${createdTask.categoryName} has been added successfully`,
          variant: 'success',
        });
        setOpenTaskDialog(false);
        await onSuccess(); // Refresh the data
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
    setIsSubmitting(false);
  };

  const handleAddNewSkillSubmit = async (data: z.infer<typeof SkillCreateSchema>) => {
    setIsSubmitting(true);
    const token = getCookie(COOKIE_NAME);
    const parsedFormData = { ...data, skillCategoryId: selectedSkillCategory?.id };
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsedFormData),
      });
      const createdSkill: Skill | ErrorResponse = await response.json();
      if ('code' in createdSkill) {
        console.log('Skill Created', createdSkill);
        throw new Error(createdSkill.message);
      }
      if (createdSkill) {
        toast({
          title: 'Skill Added',
          description: `Skill ${createdSkill.name} has been added successfully`,
          variant: 'success',
        });
        setOpenAddSkillDialog(false);
        await onSuccess(); // Refresh the data
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
    setIsSubmitting(false);
  };
  return (
    <>
      <DialogWrapper
        open={openSkillDialog}
        onOpenChange={() => setOpenSkillDialog(!openSkillDialog)}
        title="Add Skill Category"
      >
        <SkillCategoryCreateForm
          onSubmit={handleSkillSubmit}
          onCancel={() => setOpenSkillDialog(false)}
          isSubmitting={isSubmitting}
        />
      </DialogWrapper>

      <DialogWrapper
        open={openTaskDialog}
        onOpenChange={() => setOpenTaskDialog(!openTaskDialog)}
        title="Add Task Category"
      >
        <TaskCategoryForm
          onSubmit={handleTaskSubmit}
          onCancel={() => setOpenTaskDialog(false)}
          isSubmitting={isSubmitting}
        />
      </DialogWrapper>
      <DialogWrapper
        open={openAddSkillDialog}
        onOpenChange={() => setOpenAddSkillDialog(!openAddSkillDialog)}
        title="Add New Skill"
      >
        <AddNewSkillForm
          onSubmit={handleAddNewSkillSubmit}
          onCancel={() => setOpenAddSkillDialog(false)}
          isSubmitting={isSubmitting}
        />
      </DialogWrapper>
    </>
  );
};
