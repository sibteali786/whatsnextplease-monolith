'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MultiSelect } from '../ui/multi-select';
import { TaskStatusEnum, TaskPriorityEnum, Roles } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export default function TableFilter({ role }: { role?: Roles }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedType, setSelectedType] = useState<string>('Unassigned');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const updateParams = (key: string, values: string[] | string) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    if (Array.isArray(values)) {
      if (values.length > 0) currentParams.set(key, values.join(','));
      else currentParams.delete(key);
    } else {
      if (values && values !== 'All') currentParams.set(key, values);
      else currentParams.delete(key);
    }

    router.push(`${pathname}?${currentParams.toString()}`);
  };

  // Handle type change
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    updateParams('type', value);
  };
  // handle Status change
  const handleStatusChange = (value: string[]) => {
    setSelectedStatus(value);
    updateParams('status', value);
  };

  // handle Priority change
  const handlePriorityChange = (value: string[]) => {
    setSelectedPriority(value);
    updateParams('priority', value);
  };
  useEffect(() => {
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');

    setSelectedType(typeParam || 'unassigned');
    setSelectedStatus(statusParam ? decodeURIComponent(statusParam).split(',') : []);
    setSelectedPriority(priorityParam ? decodeURIComponent(priorityParam).split(',') : []);
  }, [searchParams]);
  return (
    <div className="flex gap-4">
      {/* Type Filter (assigned, unassigned etc.) */}
      {role !== Roles.CLIENT && (
        <Select onValueChange={handleTypeChange} value={selectedType}>
          <SelectTrigger className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {['all', 'assigned', 'unassigned', 'my-tasks'].map(value => (
              <SelectItem key={value} value={value} className="pr-10">
                {
                  value
                    .split('-') // ["my", "tasks"]
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // ["My", "Tasks"]
                    .join(' ') // "My Tasks"
                }
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Status Filter */}
      <MultiSelect
        options={Object.entries(TaskStatusEnum).map(([, value]) => ({
          label: transformEnumValue(value), // Applying the transform function here
          value: value,
        }))}
        onValueChange={handleStatusChange}
        value={selectedStatus}
        placeholder="Status"
        maxCount={1}
      />
      {/*  Priority Filter */}
      <MultiSelect
        options={Object.entries(TaskPriorityEnum).map(([, value]) => ({
          label: transformEnumValue(value),
          value: value,
        }))}
        onValueChange={handlePriorityChange}
        value={selectedPriority}
        placeholder="Priority"
        maxCount={1}
      />
    </div>
  );
}
