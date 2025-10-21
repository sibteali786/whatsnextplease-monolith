'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { MultiSelect } from '../ui/multi-select';
import { TaskStatusEnum } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function TableFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]); // F
  const handleStatusChange = (value: string[]) => {
    const currentParams = new URLSearchParams(searchParams.toString());

    if (value.length > 0) {
      // Join the selected status values into a comma-separated string and set it in the URL
      currentParams.set('status', value.join(','));
    } else {
      currentParams.delete('status'); // Remove the status if no values are selected
    }

    // Update the URL query parameters
    router.push(`${pathname}?${currentParams.toString()}`);
    setSelectedStatus(value);
  };
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      // Split the status query parameter (comma-separated) and set it in the state as string[]
      const statusArray = decodeURIComponent(statusParam).split(',');
      setSelectedStatus(statusArray); // Store as string[] to match MultiSelect
    }
  }, [searchParams]);

  return (
    <div>
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
    </div>
  );
}
