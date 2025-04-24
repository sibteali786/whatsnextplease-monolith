'use client';
import { SearchIcon } from 'lucide-react';
import { Input } from './ui/input';

interface SearchProps {
  placeholder: string;
  onSearch?: (term: string) => void;
}

export default function Search({ placeholder, onSearch }: SearchProps) {
  function handleSearch(term: string) {
    if (onSearch) {
      onSearch(term);
    } else {
      console.log(term);
    }
  }

  return (
    <div className="relative flex flex-1 flex-shrink-0 my-2">
      <Input
        type="search"
        placeholder={placeholder}
        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        onChange={e => {
          handleSearch(e.target.value);
        }}
      />
      <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
