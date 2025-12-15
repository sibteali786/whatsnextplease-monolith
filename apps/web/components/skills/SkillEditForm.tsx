'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DynamicIcon } from '@/utils/Icon';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SkillCategory } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, CircleX } from 'lucide-react';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DynamicBreadcrumb } from './DynamicBreadcrumb';
import { skillIconMap } from './SkillsList';

// Schema for skill validation
const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  description: z.string().optional(),
  categoryId: z.string(),
});

type SkillFormProps = {
  selectedCategory: SkillCategory;

  onSuccess: () => void;
  skill: {
    id: string;
    name: string;
    description: string | null;
  };
};
export const SkillEditForm: React.FC<SkillFormProps> = ({
  selectedCategory,

  onSuccess,
  skill,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof skillSchema>>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: '',
      description: '',
      categoryId: selectedCategory.id,
    },
  });
  const breadcrumbLinks = [
    { label: 'Edit Skill' },
    ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
  ];
  const onSubmit = async (data: z.infer<typeof skillSchema>) => {
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
          skillCategoryId: selectedCategory.id,
          skillId: skill.id,
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Skill Updated Successfully',
          description: `"${data.name}" has been added to ${selectedCategory.categoryName}`,
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
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  useEffect(() => {
    form.reset({
      name: skill?.name || '',
      description: skill?.description || '',
      categoryId: selectedCategory.id,
    });
  }, [skill]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Card
          key={skill.id}
          className="rounded-2xl shadow-sm flex justify-center items-center cursor-pointer transition-colors duration-200 hover:bg-[rgb(168_85_247/18%)]"
        >
          <CardHeader className="flex flex-col items-center">
            <DynamicIcon
              name={skillIconMap[skill.name] || 'Circle'}
              className="h-10 w-10 text-purple-600 mb-2"
            />
            <CardTitle className="text-sm font-medium text-center">{skill.name}</CardTitle>
            <CardDescription className="text-xs text-center text-gray-500">
              {skill.description}
            </CardDescription>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="flex flex-row items-center justify-start gap-6">
          <DialogTitle className="text-2xl">
            <DynamicBreadcrumb links={breadcrumbLinks} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Skill Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter skill name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Skill Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a brief description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden field for categoryId */}
              <input type="hidden" {...form.register('categoryId')} value={selectedCategory.id} />

              {/* Submit and Cancel Buttons */}

              <DialogFooter className="py-3">
                <div className="flex flex-row gap-4 items-center">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || !form.formState.isDirty}>
                    Update Skill
                  </Button>
                </div>
              </DialogFooter>

              {/* Error Message */}
              {form.formState.errors.root && (
                <p className="text-red-500 text-center">{form.formState.errors.root.message}</p>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
