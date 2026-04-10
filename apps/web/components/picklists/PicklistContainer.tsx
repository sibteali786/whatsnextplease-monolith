import { useToast } from '@/hooks/use-toast';
import { trimWhitespace } from '@/utils/utils';
import { SkillCategoryCreateSchema, SkillCreateSchema } from '@wnp/types';
import { useState } from 'react';
import { z } from 'zod';
import { DialogWrapper } from './DialogWrapper';
import { SkillCategoryCreateForm } from './SkillCategoryCreateForm';
import { TaskCategoryForm } from './TaskCategoryCreateForm';
import { AddNewSkillForm } from './AddNewSkillForm';
import { useSelectedSkillCategory } from '@/store/useSkillCategoryStore';
import { apiClient } from '@/lib/apiClient';
import {
  CreateSkillCategoryResponse,
  CreateSkillResponse,
  CreateTaskCategoryResponse,
} from '@/types/tasks/api-response';

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
    try {
      const createdSkill = await apiClient.post<CreateSkillCategoryResponse>(
        '/skillCategory/create',
        data
      );
      if (createdSkill.success && createdSkill.data) {
        toast({
          title: 'Skill Category Added',
          description: `Skill category ${createdSkill.data.categoryName} has been added successfully`,
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
    const trimmedData = trimWhitespace(data);
    try {
      const createdTask = await apiClient.post<CreateTaskCategoryResponse>(
        '/taskCategory/create',
        trimmedData
      );
      if (createdTask.success && createdTask.data) {
        toast({
          title: 'Task Category Added',
          description: `Task category ${createdTask.data.categoryName} has been added successfully`,
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
    const parsedFormData = { ...data, skillCategoryId: selectedSkillCategory?.id };
    try {
      const createdSkill = await apiClient.post<CreateSkillResponse>(
        '/skill/create',
        parsedFormData
      );
      if ('code' in createdSkill) {
        throw new Error(createdSkill.message);
      }
      if (createdSkill.success && createdSkill.data) {
        toast({
          title: 'Skill Added',
          description: `Skill ${createdSkill.data.name} has been added successfully`,
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
