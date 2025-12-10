'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { buildGlobalSearchIndex } from '@/utils/globalSearchIndex';
import { globalSearchableItems } from './static';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { DurationEnum } from '@/types';
import { TaskTable } from '@/utils/validationSchemas';

type SearchableRoles = keyof typeof globalSearchableItems;

interface NavChild {
  id: string;
  label: string;
  route: string;
  parent: string;
}

interface NavGroup {
  parent: string;
  items: NavChild[];
}

export function SearchableGlobalNavigator({ role }: { role?: SearchableRoles }) {
  const router = useRouter();

  // ------------------------------
  // LOCAL STATE
  // ------------------------------
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<TaskTable[]>([]);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ------------------------------
  // NAVIGATION SEARCH (Fuse)
  // ------------------------------
  const { fuse, items } = buildGlobalSearchIndex(role ?? 'TASK_AGENT');
  const navResults = query.trim() ? fuse.search(query).map(r => r.item) : items;

  // Group navigation items
  const navGroups: NavGroup[] = Object.values(
    navResults.reduce<Record<string, NavGroup>>((acc, item) => {
      const key = item.parent || 'Other';
      if (!acc[key]) acc[key] = { parent: key, items: [] };
      acc[key].items.push(item as NavChild);
      return acc;
    }, {})
  );

  // ------------------------------
  // TASK FETCHER (Backend Search)
  // ------------------------------
  const fetchTasks = useCallback(
    async (reset = false) => {
      if (loadingTasks) return;

      setLoadingTasks(true);

      try {
        const response = await tasksByType(
          'all',
          reset ? null : cursor, // cursor for pagination
          5, // page size
          query, // search term
          DurationEnum.ALL
        );

        if (response.success) {
          const newTasksArray = Array.isArray(response.tasks) ? response.tasks : [];

          if (reset) {
            setTasks(newTasksArray);
          } else {
            setTasks(prev => [...prev, ...newTasksArray]);
          }

          setCursor(response.nextCursor);
          setHasMoreTasks(response.hasNextCursor);
        }
      } catch (err) {
        console.error('Task fetch failed:', err);
      }

      setLoadingTasks(false);
    },
    [cursor, query, loadingTasks]
  );

  // ---------------------------------------
  // Trigger fresh fetch when search changes
  // ---------------------------------------
  useEffect(() => {
    setCursor(null);
    setHasMoreTasks(true);
    fetchTasks(true); // reset
  }, [query]);

  // ------------------------------
  // BUILD DROPDOWN ITEMS
  // ------------------------------
  const dropdownItems = [
    // NAVIGATION GROUPS
    ...navGroups.flatMap(group => {
      const parentId = `__group-${group.parent}`;

      return [
        {
          value: parentId,
          label: group.parent,
          _type: 'group' as const,
        },
        ...group.items.map(child => ({
          value: child.id,
          label: child.label,
          route: child.route,
          _type: 'nav-child' as const,
        })),
      ];
    }),

    // TASK GROUP (only if tasks exist)
    ...(tasks && tasks.length > 0
      ? [
          {
            value: '__group-tasks',
            label: 'Tasks',
            _type: 'group' as const,
          },

          ...tasks.map(task => ({
            value: task.id,
            label: `${task.serialNumber} — ${task.title}`,
            _type: 'task-child' as const,
          })),
        ]
      : []),
  ];

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <SearchableDropdown
      items={dropdownItems}
      value=""
      placeholder="Search actions, tasks, pages..."
      searchQuery={query}
      onSearch={setQuery}
      onScrollEnd={() => {
        if (hasMoreTasks && !loadingTasks) {
          fetchTasks(); // fetch next page
        }
      }}
      className="rounded-full"
      onChange={id => {
        if (!id) return; // prevents group header clicks

        const selected = dropdownItems.find(i => i.value === id);

        if (selected?._type === 'nav-child') {
          router.push(selected.route);
        }

        if (selected?._type === 'task-child') {
          router.push(`/tasks/${selected.value}`);
        }
      }}
      renderOption={item =>
        item._type === 'group' ? (
          <div className="text-xs font-semibold text-muted-foreground py-1">{item.label}</div>
        ) : (
          <div className="flex flex-col pl-4">
            <p className="text-sm text-start">{item.label}</p>
          </div>
        )
      }
    />
  );
}
