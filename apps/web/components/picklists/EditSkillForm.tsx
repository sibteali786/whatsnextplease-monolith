import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SkillEditSchema } from '@wnp/types';
import { SkillCategoryState } from '@wnp/types';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle, CircleX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { toast } from '@/hooks/use-toast';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

type Skill = {
  id?: string;
  name: string;
  description: string;
};

export const EditSkillForm = ({
  skill,
  onSuccess,
  skillCategory,
}: {
  skill: Skill;
  onSuccess: () => Promise<void>;
  skillCategory: SkillCategoryState;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof SkillEditSchema>>({
    resolver: zodResolver(SkillEditSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: skill.name,
      description: skill.description || '',
      skillCategoryId: skillCategory?.id,
      skillId: skill.id,
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  const onSubmit = async (data: z.infer<typeof SkillEditSchema>) => {
    try {
      setLoading(true);

      const cleanedName = data.name.trim();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/edit`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanedName,
          description: data.description,
          skillCategoryId: skillCategory.id,
          skillId: data.skillId,
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Skill Updated Successfully',
          description: `"${data.name}" has been updated in ${skillCategory?.categoryName}`,
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

  useEffect(() => {
    form.reset({
      name: skill?.name || '',
      description: skill?.description || '',
      skillCategoryId: skillCategory?.categoryName,
      skillId: skill.id,
    });
  }, [skill, skillCategory]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Badge className="py-1 px-4 text-[10px] text-nowrap cursor-pointer hover:bg-primary/60 transition-colors">
          {skill.name}
        </Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="px-6 flex flex-row gap-2 items-center">
          <ArrowLeft
            onClick={() => handleOpenChange(false)}
            className="w-4 h-4 cursor-pointer mt-2"
          />
          <DialogTitle>Edit Skill</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6 flex-1 overflow-y-auto px-6 py-6">
              <FormField
                control={form.control}
                name="skillCategoryId"
                defaultValue={skillCategory?.categoryName}
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
