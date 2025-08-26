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
