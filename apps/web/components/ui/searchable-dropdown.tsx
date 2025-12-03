'use client';

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'relative z-50 max-h-96 w-[var(--trigger-width)] min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

interface BaseItem {
  value: string;
  label: string;
}

interface SearchableDropdownProps<T extends BaseItem> {
  items: T[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;

  renderOption?: (item: T) => React.ReactNode;
  /** Called when user scrolls near the bottom. Pass current search query. */
  onScrollEnd?: (currentSearch: string) => void;
  /** Called when user types search text */
  onSearch?: (query: string) => void;
  searchQuery?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Custom UI for “no selection” (like No Assignee) */
  noSelectionContent?: React.ReactNode;
  /** Value that represents "no selection" (default: 'none') */
  noSelectionValue?: string;

  ensureItemInList?: T;
}

/**
 * Searchable dropdown fully controlled via parent for items and search.
 */
export function SearchableDropdown<T extends BaseItem>({
  items,
  placeholder = 'Select option',
  value,
  onChange,
  className,
  searchPlaceholder = 'Search...',
  noResultsText = 'No results found',
  disabled,
  renderOption,
  onScrollEnd,
  onSearch,
  searchQuery,
  debounceMs = 500,
  noSelectionContent,
  noSelectionValue = 'none',
  ensureItemInList,
}: SearchableDropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const debounceTimeout = React.useRef<number | null>(null);

  // Ensure the selected item is in the list
  const displayItems = React.useMemo(() => {
    if (!ensureItemInList) return items;
    const itemExists = items.some(item => item.value === ensureItemInList.value);
    if (itemExists) return items;
    return [ensureItemInList, ...items];
  }, [items, ensureItemInList]);
  const selected = displayItems.find(i => i.value === value);

  // -----------------------------
  // Adjust dropdown width
  // -----------------------------
  React.useEffect(() => {
    if (triggerRef.current) {
      document.documentElement.style.setProperty(
        '--trigger-width',
        `${triggerRef.current.offsetWidth}px`
      );
    }
  }, [triggerRef.current]);

  // -----------------------------
  // Handle scroll (infinite load)
  // -----------------------------
  const handleScroll = React.useCallback(() => {
    if (!listRef.current || !onScrollEnd) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const offset = 10; // px before bottom
    const nearBottom = scrollTop + clientHeight >= scrollHeight - offset;

    if (nearBottom) {
      onScrollEnd(search); // pass search query up
    }
  }, [onScrollEnd, search]);
  // -----------------------------
  // Handle debounced search
  // -----------------------------
  const handleSearchChange = (query: string) => {
    setSearch(query);

    if (!onSearch) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = window.setTimeout(() => {
      onSearch(query); // notify parent
    }, debounceMs);
  };
  React.useEffect(() => {
    if (!searchQuery) return;
    setSearch(searchQuery || '');
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          disabled={disabled}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value === noSelectionValue ? (
              (noSelectionContent ?? <span className="text-muted-foreground">{placeholder}</span>)
            ) : selected ? (
              selected.label
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="p-1">
        <div className="p-2">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Dropdown List */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-[170px] overflow-y-auto flex flex-col gap-1"
          >
            {displayItems.length > 0 ? (
              displayItems.map(item => (
                <button
                  key={item.value}
                  onClick={() => {
                    onChange?.(item.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                    value === item.value && 'bg-accent text-accent-foreground'
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    {renderOption ? renderOption(item) : <span>{item.label}</span>}
                  </div>
                  {value === item.value && <Check className="ml-2 h-4 w-4" />}
                </button>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{noResultsText}</div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
