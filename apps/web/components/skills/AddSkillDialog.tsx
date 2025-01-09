"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { ArrowLeft, PlusCircle, Search } from "lucide-react";
import { DynamicIcon } from "@/utils/Icon";
import { SkillCategory } from "@/types";
import { skillIconMap } from "./SkillsList";
import { getCategoriesWithSkills } from "@/db/repositories/skills/getSkillsWithCategories";
import { Skeleton } from "@/components/ui/skeleton"; // Import ShadCN Skeleton
import { SkillForm } from "./SkillAddForm";
import { DynamicBreadcrumb } from "./DynamicBreadcrumb";

interface AddSkillDialogProps {
  skills: SkillCategory[];
}

export const AddSkillDialog: React.FC<AddSkillDialogProps> = ({ skills }) => {
  const [selectedCategory, setSelectedCategory] =
    useState<SkillCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSkills, setFilteredSkills] = useState<SkillCategory[]>(skills);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [loading, setLoading] = useState(false); // Loading state

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    async function fetchFilteredSkills() {
      setLoading(true);
      if (debouncedSearchTerm.trim()) {
        const result = await getCategoriesWithSkills(debouncedSearchTerm);
        setFilteredSkills(result);
      } else {
        setFilteredSkills(skills);
      }
      setLoading(false);
    }
    fetchFilteredSkills();
  }, [debouncedSearchTerm, skills]);

  const handleCancel = () => {
    setSelectedCategory(null);
  };

  const handleSuccess = () => {
    setSelectedCategory(null); // Reset to category selection after success
  };

  const breadcrumbLinks = [
    { label: "Add Skill", onClick: handleCancel },
    ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle />
          Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[70%] p-6">
        <DialogHeader className="flex flex-row items-center justify-start gap-6">
          {/* Show back arrow if a category is selected */}
          {selectedCategory && (
            <ArrowLeft className="cursor-pointer" onClick={handleCancel} />
          )}
          <DialogTitle className="text-2xl">
            <DynamicBreadcrumb links={breadcrumbLinks} />
          </DialogTitle>
        </DialogHeader>

        {/* If a category is selected, show the SkillForm */}
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
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>

            {/* Loading Skeletons or Category List */}
            <div className="space-y-4">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-background/20"
                    >
                      <Skeleton className="w-14 h-14 rounded-full bg-purple-100" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))
                : filteredSkills.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-start gap-4 p-4 rounded-lg border cursor-pointer hover:bg-background/20"
                      onClick={() => setSelectedCategory(category)}
                    >
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-purple-100">
                        <DynamicIcon
                          name={skillIconMap[category.categoryName] || "Circle"}
                          className="h-8 w-8 text-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {category.categoryName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Includes: {category.skillsDescription}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>

            {/* Back Button */}
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleCancel}>
                Back
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
