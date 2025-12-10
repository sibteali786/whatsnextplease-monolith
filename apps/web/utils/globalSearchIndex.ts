import Fuse from 'fuse.js';
import { globalSearchableItems } from '@/components/static';

export function buildGlobalSearchIndex(role: keyof typeof globalSearchableItems) {
  // flatten items + add id for dropdown
  const items = globalSearchableItems[role].map((item, index) => ({
    id: `${role}-${index}`,
    ...item,
  }));

  const fuse = new Fuse(items, {
    keys: ['label', 'parent', 'keywords'],
    threshold: 0.3, // good fuzzy tolerance
    includeScore: true,
  });

  return { fuse, items };
}
