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
import { useToast } from '@/hooks/use-toast';
import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';
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
  const { toast } = useToast();
  const onSubmit = async (data: z.infer<typeof SkillCategoryCreateSchema>) => {
    const parsedData = SkillCategoryCreateSchema.parse(data);
    const token = getCookie(COOKIE_NAME);
    try {
      // Add the skill category
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsedData),
      });

      const createdSkill = await response.json();
      if (createdSkill) {
        toast({
          title: 'Skill Category Added',
          description: `Skill category ${createdSkill.categoryName} has been added successfully`,
          variant: 'success',
        });
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
    setOpen(false);
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
