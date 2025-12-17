'use client';
import { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DurationEnum, DurationEnumList } from '@/types';
import TableFilter from '../tasks/TableFilter';
import { Roles, TaskStatusEnum } from '@prisma/client';

export const SearchNFilter = ({
  filterList,
  onSearch,
  role,
  statusFilter,
}: {
  filterList?: DurationEnumList;
  onSearch: (term: string, duration: DurationEnum) => void; // Updated to include duration
  role?: Roles;
  statusFilter?: TaskStatusEnum[];
}) => {
  const [term, setTerm] = useState('');
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL); // New state for duration
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(term);

  // Debouncing the search term input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(term.trim());
    }, 500); // Adjust the debounce delay as needed

    return () => {
      clearTimeout(handler);
    };
  }, [term]);

  // Trigger the search when the debounced term or duration changes
  useEffect(() => {
    onSearch(debouncedSearchTerm, duration);
  }, [debouncedSearchTerm, duration, onSearch]);

  return (
    <div className="flex items-center gap-4 justify-start flex-1 flex-wrap">
      <div className="relative w-[250px] max-w-[350px]">
        <Input
          placeholder="Search tasks"
          className="pl-10 rounded-full"
          onChange={e => setTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
      </div>
      {filterList && (
        <Select
          onValueChange={(value: DurationEnum) => setDuration(value)} // Handle duration change
        >
          <SelectTrigger className="h-[40px] px-4 flex justify-between items-center gap-3 w-fit text-[#9ca3af]">
            <SelectValue placeholder="Duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Durations</SelectLabel>
              {filterList &&
                filterList.map(duration => (
                  <SelectItem key={duration.value} value={duration.label}>
                    {duration.value}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
      <TableFilter role={role} statusFilter={statusFilter} />
    </div>
  );
};
