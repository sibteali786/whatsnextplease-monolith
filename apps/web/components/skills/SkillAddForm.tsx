"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SkillCategory, SkillType } from "@/types";
import { addSkill } from "@/db/repositories/skills/addSkill";

// Schema for skill validation
const skillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  description: z.string().optional(),
  categoryId: z.string(),
});

type SkillFormProps = {
  selectedCategory: SkillCategory;
  onCancel: () => void;
  onSuccess: (skill: SkillType) => void; // Replace `any` with the type of skill if available
};

export const SkillForm: React.FC<SkillFormProps> = ({
  selectedCategory,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof skillSchema>>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      categoryId: selectedCategory.id,
    },
  });

  const onSubmit = async (data: z.infer<typeof skillSchema>) => {
    setLoading(true);
    const response = await addSkill(data);
    setLoading(false);

    if (response.success) {
      onSuccess(response.skill);
      form.reset();
    } else {
      form.setError("root", { message: response.message });
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
          <input
            type="hidden"
            {...form.register("categoryId")}
            value={selectedCategory.id}
          />

          {/* Submit and Cancel Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Skill"}
            </Button>
          </div>

          {/* Error Message */}
          {form.formState.errors.root && (
            <p className="text-red-500 text-center">
              {form.formState.errors.root.message}
            </p>
          )}
        </form>
      </Form>
    </div>
  );
};
