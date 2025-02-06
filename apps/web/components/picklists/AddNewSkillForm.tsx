import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CategoryFormProps } from './SkillCategoryCreateForm';
import { SkillCreateSchema } from '@wnp/types';
import { useSelectedSkillCategory } from '@/store/useSkillCategoryStore';

export const AddNewSkillForm = ({ onSubmit, onCancel, isSubmitting }: CategoryFormProps) => {
  const { selectedSkillCategory } = useSelectedSkillCategory();
  const form = useForm<z.infer<typeof SkillCreateSchema>>({
    resolver: zodResolver(SkillCreateSchema),
    mode: 'onSubmit',
    defaultValues: {
      skillCategoryId: selectedSkillCategory?.categoryName,
    },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6 flex-1 overflow-y-auto px-6 py-6">
          <FormField
            control={form.control}
            name="skillCategoryId"
            disabled
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skill Category*</FormLabel>
                <FormControl>
                  <Input placeholder="Web Development" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Web Development" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="description...." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter className="px-6">
          <div className="flex flex-row gap-4 items-center">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
};
