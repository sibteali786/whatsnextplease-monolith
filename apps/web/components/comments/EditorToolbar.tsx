'use client';

import React from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link,
  Undo2,
  Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

interface EditorToolbarProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  shortcut?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  icon,
  tooltip,
  shortcut,
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn('h-8 w-8 p-0', isActive && 'bg-accent text-accent-foreground')}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <div className="text-sm">{tooltip}</div>
          {shortcut && <div className="text-xs text-muted-foreground mt-1">{shortcut}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  const toggleLink = () => {
    if (!editor) return;
    // Check if we're already in a link
    if (editor.isActive('link')) {
      console.log('Removing link');
      editor.chain().focus().unsetLink().run();
      return;
    }

    // Get current selection
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    console.log('Selected text:', selectedText);
    // If there's selected text, use it as the link text
    if (selectedText && selectedText.trim()) {
      const url = window.prompt('Enter URL:', 'https://');
      if (url && url.trim() && url !== 'https://') {
        editor.chain().focus().setLink({ href: url.trim() }).run();
      }
    } else {
      // No selection, ask for both text and URL
      const url = window.prompt('Enter URL:', 'https://');
      if (url && url.trim() && url !== 'https://') {
        editor.chain().focus().insertContent(`<a href="${url.trim()}">${url.trim()}</a>`).run();
      }
    }
  };
  React.useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if editor is focused
      if (!editor.isFocused) return;

      const cmdKey = event.ctrlKey || event.metaKey;
      // Cmd/Ctrl + K for links
      if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleLink();
      }

      if ((event.key === '>' || event.key === '.') && cmdKey && event.shiftKey) {
        event.preventDefault();
        editor.chain().focus().toggleBlockquote().run();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, toggleLink]);
  if (!editor) {
    return null;
  }
  return (
    <div className="border-b border-border p-2 flex items-center gap-1 flex-wrap">
      {/* Text Formatting */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={<Bold className="w-4 h-4" />}
          tooltip="Bold"
          shortcut="⌘+B"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={<Italic className="w-4 h-4" />}
          tooltip="Italic"
          shortcut="⌘+I"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          icon={<Code className="w-4 h-4" />}
          tooltip="Inline Code"
          shortcut="⌘+E"
        />
      </div>
      <Separator orientation="vertical" className="h-6" />
      {/* Lists */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={<List className="w-4 h-4" />}
          tooltip="Bullet List"
          shortcut="⌘+⇧+8"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={<ListOrdered className="w-4 h-4" />}
          tooltip="Numbered List"
          shortcut="⌘+⇧+7"
        />
      </div>
      <Separator orientation="vertical" className="h-6" />
      {/* Blocks */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={<Quote className="w-4 h-4" />}
          tooltip="Quote"
          shortcut="⌘+⇧+>"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          icon={<Code2 className="w-4 h-4" />}
          tooltip="Code Block"
          shortcut="⌘+⌥+C"
        />
        <ToolbarButton
          onClick={toggleLink}
          isActive={editor.isActive('link')}
          icon={<Link className="w-4 h-4" />}
          tooltip={editor.isActive('link') ? 'Remove Link' : 'Add Link'}
          shortcut="⌘+K"
        />
      </div>
      <Separator orientation="vertical" className="h-6" />
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo2 className="w-4 h-4" />}
          tooltip="Undo"
          shortcut="⌘+Z"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo2 className="w-4 h-4" />}
          tooltip="Redo"
          shortcut="⌘+Y"
        />
      </div>
      {/* Mention Helper */}
      <div className="ml-auto flex items-center gap-2">
        <div className="text-xs text-muted-foreground hidden sm:block">
          Press @ to mention • ``` for code
        </div>
        <KeyboardShortcutsHelp />
      </div>
    </div>
  );
};

export default EditorToolbar;
