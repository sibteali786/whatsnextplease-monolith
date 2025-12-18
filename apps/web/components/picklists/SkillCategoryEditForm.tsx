import { zodResolver } from '@hookform/resolvers/zod';
import { SkillCategoryEditSchema } from '@wnp/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle, CircleX, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';
import { toast } from '@/hooks/use-toast';

export const SkillCategoryEditForm = ({
  dropdownItem = false,
  categoryName,
  id,
  onSuccess,
}: {
  dropdownItem?: boolean;
  categoryName: string;
  id: string;
  onSuccess: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof SkillCategoryEditSchema>>({
    resolver: zodResolver(SkillCategoryEditSchema),
    mode: 'onSubmit',
    defaultValues: {
      id: id,
      categoryName: categoryName,
    },
  });
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  const onSubmit = async (data: z.infer<typeof SkillCategoryEditSchema>) => {
    try {
      setLoading(true);

      const cleanedName = data.categoryName.trim();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/edit`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryName: cleanedName,
          id: data.id,
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Skill Category Updated Successfully',
          description: `"${data.categoryName}" has been updated successfully.`,
          variant: 'success',
          icon: <CheckCircle size={40} />,
        });
        form.reset();
        onSuccess();
      } else {
        form.setError('root', { message: result.message });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to update skill',
        description: error instanceof Error ? error.message : 'Something went wrong',
        icon: <CircleX size={40} />,
      });
    } finally {
      setLoading(false);
      handleOpenChange(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {dropdownItem ? (
          <Button
            className="flex gap-2 bg-transparent hover:bg-[#e5e7eb23] px-[11px] py-[6px]"
            size={'sm'}
          >
            <Edit2 className="w-3 h-3" /> Edit Skill Category
          </Button>
        ) : (
          <h2
            className="text-lg font-semibold text-purple-600 mb-4
               hover:underline hover:scale-105
               underline-offset-4
               transition-all duration-200 ease-out
              w-fit"
          >
            {categoryName}
          </h2>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="px-6 flex flex-row gap-2 items-center">
          <ArrowLeft
            onClick={() => handleOpenChange(false)}
            className="w-4 h-4 cursor-pointer mt-2"
          />
          <DialogTitle>Edit Skill Category</DialogTitle>
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
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !form.formState.isDirty}>
                  Update
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
