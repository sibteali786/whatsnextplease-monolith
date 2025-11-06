'use client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { ArrowLeft, PlusCircle, Search, X } from 'lucide-react';
import { DynamicIcon } from '@/utils/Icon';
import { SkillCategory } from '@/types';
import { skillIconMap } from './SkillsList';
import { Skeleton } from '@/components/ui/skeleton';
import { SkillForm } from './SkillAddForm';
import { DynamicBreadcrumb } from './DynamicBreadcrumb';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { useForm } from 'react-hook-form';
import { SkillCategoryCreateSchema } from '@wnp/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { toast } from '@/hooks/use-toast';

interface AddSkillDialogProps {
  skills: SkillCategory[];
  onSkillAdded?: () => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  taskOffering?: boolean;
  setReload?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AddSkillDialog: React.FC<AddSkillDialogProps> = ({
  skills,
  onSkillAdded,
  open,
  setOpen,
  taskOffering = false,
  setReload,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSkillCategory, setShowSkillCategory] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<SkillCategory[]>(skills);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof SkillCategoryCreateSchema>>({
    resolver: zodResolver(SkillCategoryCreateSchema),
    mode: 'onSubmit',
  });

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Search functionality
  useEffect(() => {
    async function fetchFilteredSkills() {
      if (debouncedSearchTerm.trim() === '') {
        setFilteredSkills(skills);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/skillCategory/search?q=${encodeURIComponent(debouncedSearchTerm)}`,
          {
            headers: {
              Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          setFilteredSkills(result);
        } else {
          setFilteredSkills(skills);
        }
      } catch (error) {
        console.error('Error searching skills:', error);
        setFilteredSkills(skills);
      } finally {
        setLoading(false);
      }
    }

    fetchFilteredSkills();
  }, [debouncedSearchTerm, skills]);

  const handleCancel = () => {
    setSelectedCategory(null);
  };

  const handleSuccess = () => {
    setSelectedCategory(null);
    setIsOpen(false);
    onSkillAdded?.();
  };
  /* when skill is added successfully in task offering page */
  const handleSuccessTaskOffering = () => {
    setSelectedCategory(null);
    setReload?.((prev: boolean) => !prev);
    handleOpenChange(false);
  };
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setOpen?.(open);
    if (!open) {
      setSelectedCategory(null);
      setSearchTerm('');
    }
  };
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
        setReload?.((prev: boolean) => !prev);
        form.reset();
        form.setValue('categoryName', '');
        setShowSkillCategory(false);
        /*   await onSuccess(); */ // Refresh the data
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
  const breadcrumbLinks = [
    { label: 'Add Skill', onClick: handleCancel },
    ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
  ];
  useEffect(() => {
    if (!taskOffering) return;
    handleOpenChange(open ?? false);
  }, [taskOffering, open]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!taskOffering && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <PlusCircle />
            Add Skill
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        className={`${taskOffering ? 'max-w-[600px] max-h-[75%]' : 'max-w-[70%] max-h-[75%]'}  overflow-y-auto p-6`}
      >
        <DialogHeader className="flex flex-row items-center justify-start gap-6">
          {selectedCategory && <ArrowLeft className="cursor-pointer" onClick={handleCancel} />}
          <DialogTitle className="text-2xl">
            <DynamicBreadcrumb links={breadcrumbLinks} />
          </DialogTitle>
        </DialogHeader>

        {selectedCategory ? (
          <SkillForm
            selectedCategory={selectedCategory}
            onCancel={handleCancel}
            onSuccess={taskOffering ? handleSuccessTaskOffering : handleSuccess}
          />
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Input
                placeholder="Search Category"
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>
            {/* Add New Skill Category */}
            {taskOffering && (
              <>
                {!showSkillCategory && (
                  <Button className="gap-2" onClick={() => setShowSkillCategory(true)}>
                    <PlusCircle />
                    Add Skill Category
                  </Button>
                )}

                {showSkillCategory && (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(handleSkillSubmit)}
                      className="p-2 border-2 rounded-lg"
                    >
                      <div className="space-y-6 flex-1 overflow-y-auto p-1">
                        <FormField
                          control={form.control}
                          name="categoryName"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex gap-1 justify-between items-center pb-2">
                                <FormLabel>Add a new skill category</FormLabel>
                                <X
                                  className="text-red cursor-pointer"
                                  onClick={() => setShowSkillCategory(false)}
                                />
                              </div>
                              <FormControl>
                                <Input placeholder="Skill Category Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter className="py-3">
                        <div className="flex flex-row gap-4 items-center">
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Add'}
                          </Button>
                        </div>
                      </DialogFooter>
                    </form>
                  </Form>
                )}
                {/*    <Button type="button" variant="outline">
                Add Skill Category
              </Button> */}
              </>
            )}
            {/* Category List */}
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                    <Skeleton className="w-14 h-14 rounded-full bg-purple-100" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                ))
              ) : filteredSkills.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No skill categories found</p>
                </div>
              ) : (
                filteredSkills.map(category => (
                  <div
                    key={category.id}
                    className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-background/20"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-100">
                      <DynamicIcon
                        name={skillIconMap[category.categoryName] || 'Circle'}
                        className="h-8 w-8 text-primary"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{category.categoryName}</h3>
                      <p className="text-sm text-gray-500">
                        Includes: {category.skillsDescription || 'No skills added yet.'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
