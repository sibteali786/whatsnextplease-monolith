import { SkillCategoryState } from '@wnp/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SkillCategory {
  selectedSkillCategory: SkillCategoryState | null;
  setSelectedSkillCategory: (skillCategory: SkillCategoryState) => void;
  clearSelectedSkillCategory: () => void;
}

export const useSelectedSkillCategory = create<SkillCategory>()(
  persist(
    set => ({
      selectedSkillCategory: null,
      setSelectedSkillCategory: skillCategory => set({ selectedSkillCategory: skillCategory }),
      clearSelectedSkillCategory: () => set({ selectedSkillCategory: null }),
    }),
    {
      name: 'skill-id-store',
    }
  )
);
