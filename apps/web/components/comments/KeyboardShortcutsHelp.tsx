'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: '⌘ + B', action: 'Bold' },
  { keys: '⌘ + I', action: 'Italic' },
  { keys: '⌘ + E', action: 'Inline code' },
  { keys: '⌘ + ⇧ + 8', action: 'Bullet list' },
  { keys: '⌘ + ⇧ + 7', action: 'Numbered list' },
  { keys: '⌃/⌘ + ⇧ + >', action: 'Quote' },
  { keys: '⌘ + ⌥ + C', action: 'Code block' },
  { keys: '⌘ + K', action: 'Add link' },
  { keys: '⌘ + Z', action: 'Undo' },
  { keys: '⌘ + Y', action: 'Redo' },
  { keys: '⌘ + Enter', action: 'Submit comment' },
  { keys: '@', action: 'Mention user' },
  { keys: '` ` `', action: 'Code block' },
];

const KeyboardShortcutsHelp: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Keyboard className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center py-1">
              <span className="text-sm">{shortcut.action}</span>
              <kbd className="px-2 py-1 text-xs bg-muted rounded">{shortcut.keys}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
