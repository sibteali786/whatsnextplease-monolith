"use client";
import { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { DurationEnum, DurationEnumList } from "@/types";

export const SearchNFilter = ({
  filterList,
  onSearch,
}: {
  filterList?: DurationEnumList;
  onSearch: (term: string, duration: DurationEnum) => void; // Updated to include duration
}) => {
  const [term, setTerm] = useState("");
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL); // New state for duration
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(term);

  // Debouncing the search term input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(term.trim());
    }, 300); // Adjust the debounce delay as needed

    return () => {
      clearTimeout(handler);
    };
  }, [term]);

  // Trigger the search when the debounced term or duration changes
  useEffect(() => {
    onSearch(debouncedSearchTerm, duration);
  }, [debouncedSearchTerm, duration, onSearch]);

  return (
    <div className="flex items-center gap-8 justify-start flex-1">
      <div className="relative w-[40%]">
        <Input
          placeholder="Search tasks"
          className="pl-10 rounded-full"
          onChange={(e) => setTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
      </div>
      {filterList && (
        <Select
          onValueChange={(value: DurationEnum) => setDuration(value)} // Handle duration change
        >
          <SelectTrigger className="w-[180px] rounded-full px-4">
            <SelectValue placeholder="Select a duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Durations</SelectLabel>
              {filterList &&
                filterList.map((duration) => (
                  <SelectItem key={duration.value} value={duration.label}>
                    {duration.value}
                  </SelectItem>
                ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
