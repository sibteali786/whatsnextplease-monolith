import { zodResolver } from '@hookform/resolvers/zod';
import { SkillCategoryCreateSchema } from '@wnp/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

export interface CategoryFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const SkillCategoryCreateForm = ({
  onSubmit,
  onCancel,
  isSubmitting,
}: CategoryFormProps) => {
  const form = useForm<z.infer<typeof SkillCategoryCreateSchema>>({
    resolver: zodResolver(SkillCategoryCreateSchema),
    mode: 'onSubmit',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6 flex-1 overflow-y-auto px-6 py-6">
          <FormField
            control={form.control}
            name="categoryName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skill Category Name</FormLabel>
                <FormControl>
                  <Input placeholder="Skill Category Name" {...field} />
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
