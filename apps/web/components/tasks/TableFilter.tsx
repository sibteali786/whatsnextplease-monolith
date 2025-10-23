'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MultiSelect } from '../ui/multi-select';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TableFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const updateParams = (key: string, values: string[]) => {
    const currentParams = new URLSearchParams(searchParams.toString());

    if (values.length > 0) {
      currentParams.set(key, values.join(','));
    } else {
      currentParams.delete(key);
    }

    router.push(`${pathname}?${currentParams.toString()}`);
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
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');

    if (statusParam) {
      setSelectedStatus(decodeURIComponent(statusParam).split(','));
    } else {
      setSelectedStatus([]);
    }

    if (priorityParam) {
      setSelectedPriority(decodeURIComponent(priorityParam).split(','));
    } else {
      setSelectedPriority([]);
    }
  }, [searchParams]);
  return (
    <div className="flex gap-4">
      {/* Status Filter */}
      <MultiSelect
        options={Object.entries(TaskStatusEnum).map(([, value]) => ({
          label: transformEnumValue(value), // Applying the transform function here
          value: value,
        }))}
        onValueChange={handleStatusChange}
        value={selectedStatus}
        placeholder="Select Status"
        maxCount={2}
      />
      {/*  Priority Filter */}
      <MultiSelect
        options={Object.entries(TaskPriorityEnum).map(([, value]) => ({
          label: transformEnumValue(value),
          value: value,
        }))}
        onValueChange={handlePriorityChange}
        value={selectedPriority}
        placeholder="Select Priority"
        maxCount={2}
      />
    </div>
  );
}
