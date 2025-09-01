import z from 'zod';

const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  skillCategory: z.object({
    id: z.string(),
    categoryName: z.string(),
  }),
});

export type SkillType = z.infer<typeof SkillSchema>;

const SkillCategorySchema = z.object({
  id: z.string(),
  categoryName: z.string(),
  skills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
});

export type SkillCategory = z.infer<typeof SkillCategorySchema>;
