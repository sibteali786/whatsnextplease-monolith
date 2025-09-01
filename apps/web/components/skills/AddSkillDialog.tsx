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
import { ArrowLeft, PlusCircle, Search } from 'lucide-react';
import { DynamicIcon } from '@/utils/Icon';
import { SkillCategory } from '@/types';
import { skillIconMap } from './SkillsList';
import { Skeleton } from '@/components/ui/skeleton';
import { SkillForm } from './SkillAddForm';
import { DynamicBreadcrumb } from './DynamicBreadcrumb';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

interface AddSkillDialogProps {
  skills: SkillCategory[];
  onSkillAdded: () => void;
}

export const AddSkillDialog: React.FC<AddSkillDialogProps> = ({ skills, onSkillAdded }) => {
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<SkillCategory[]>(skills);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    onSkillAdded();
  };
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedCategory(null);
      setSearchTerm('');
    }
  };

  const breadcrumbLinks = [
    { label: 'Add Skill', onClick: handleCancel },
    ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle />
          Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[70%] p-6">
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
            onSuccess={handleSuccess}
          />
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative mb-6">
              <Input
                placeholder="Search Category"
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>

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
                        Includes: {category.skillsDescription}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline">Back</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
