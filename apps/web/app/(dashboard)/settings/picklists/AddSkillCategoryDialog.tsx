import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@radix-ui/react-dialog';
import { SkillCategoryCreateSchema } from '@wnp/types';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface AddSkillCategoryDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const AddSkillCategoryDialog = ({ open, setOpen }: AddSkillCategoryDialogProps) => {
  const form = useForm<z.infer<typeof SkillCategoryCreateSchema>>({
    resolver: zodResolver(SkillCategoryCreateSchema),
    mode: 'onSubmit',
  });

  const onSubmit = (data: z.infer<typeof SkillCategoryCreateSchema>) => {
    console.log('Data', data);
  };

  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      <DialogContent className="max-w-[700px] max-h-[98%] overflow-hidden px-0">
        <DialogHeader className="px-6 flex flex-row gap-2 items-center">
          <ArrowLeft onClick={() => setOpen(!open)} className="w-4 h-4 cursor-pointer mt-2" />
          <DialogTitle>Add Skill Categories</DialogTitle>
        </DialogHeader>
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
                <Button type="button" variant="outline" onClick={() => setOpen(!open)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
