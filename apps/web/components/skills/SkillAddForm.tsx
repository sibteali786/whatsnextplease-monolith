'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

// Schema for skill validation
const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  description: z.string().optional(),
  categoryId: z.string(),
});

type SkillFormProps = {
  selectedCategory: SkillCategory;
  onCancel: () => void;
  onSuccess: () => void;
};

export const SkillForm: React.FC<SkillFormProps> = ({ selectedCategory, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof skillSchema>>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      categoryId: selectedCategory.id,
    },
  });

  const onSubmit = async (data: z.infer<typeof skillSchema>) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          skillCategoryId: selectedCategory.id,
        }),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'Skill Created Successfully',
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
        title: 'Failed to create skill',
        description: error instanceof Error ? error.message : 'Something went wrong',
        icon: <CircleX size={40} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Add Skill'}
            </Button>
          </div>

          {/* Error Message */}
          {form.formState.errors.root && (
            <p className="text-red-500 text-center">{form.formState.errors.root.message}</p>
          )}
        </form>
      </Form>
    </div>
  );
};
