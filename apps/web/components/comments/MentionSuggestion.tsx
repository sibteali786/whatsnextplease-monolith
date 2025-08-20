'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionUser } from '@/utils/commentSchemas';
import { cn } from '@/lib/utils';

interface MentionSuggestionProps {
  items: MentionUser[];
  command: (item: MentionUser) => void;
}

export interface MentionSuggestionRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionSuggestion = forwardRef<MentionSuggestionRef, MentionSuggestionProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : items.length - 1));
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex(prevIndex => (prevIndex < items.length - 1 ? prevIndex + 1 : 0));
          return true;
        }

        if (event.key === 'Enter') {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
          }
          return true;
        }

        return false;
      },
    }));

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    if (items.length === 0) {
      return (
        <div className="mention-dropdown">
          <div className="px-3 py-2 text-sm text-muted-foreground">No users found</div>
        </div>
      );
    }

    return (
      <div className="mention-dropdown">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command(item)}
            className={cn('mention-item', index === selectedIndex && 'mention-item-selected')}
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={item.avatar || undefined} />
              <AvatarFallback className="text-xs">
                {item.name
                  .split(' ')
                  .map(word => word.charAt(0))
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-sm truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                @{item.username} • {item.role}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionSuggestion.displayName = 'MentionSuggestion';

export default MentionSuggestion;
