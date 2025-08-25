/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent, ReactRenderer, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import ListItem from '@tiptap/extension-list-item';
import { MentionUser } from '@/utils/commentSchemas';
import MentionSuggestion, { MentionSuggestionRef } from './MentionSuggestion';
import CodeBlockComponent from './CodeBlockComponent';
import { ReactNodeViewProps } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { searchUsersAction } from '@/actions/userActions';
import { createLowlight, common } from 'lowlight';

// Languages we want to support for code highlighting
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import EditorToolbar from './EditorToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onMentionsChange: (mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

// Move searchUsers function outside component to avoid recreating
async function searchUsers(query: string): Promise<MentionUser[]> {
  if (query.length < 2) return [];
  try {
    const response = await searchUsersAction(query);
    if (!response.success) {
      console.error('Failed to search users:', response.message);
      return [];
    } else if (response.success && response.users) {
      return response.users;
    }
    return [];
  } catch (error) {
    console.error('Failed to search users:', error);
    return [];
  }
}

// Create lowlight instance outside component
const lowlight = createLowlight(common);
lowlight.register('javascript', javascript);
lowlight.register('js', javascript);
lowlight.register('typescript', typescript);
lowlight.register('ts', typescript);
lowlight.register('css', css);
lowlight.register('html', html);
lowlight.register('xml', html);
lowlight.register('json', json);
lowlight.register('python', python);
lowlight.register('py', python);
lowlight.register('sql', sql);
lowlight.register('bash', bash);
lowlight.register('shell', bash);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  onMentionsChange,
  placeholder = 'Add a comment...',
  disabled = false,
  onKeyDown,
}) => {
  const extractMentions = useCallback(
    (html: string) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const mentionElements = doc.querySelectorAll('span[data-type="mention"]');
      const mentions = Array.from(mentionElements)
        .map(el => el.getAttribute('data-id'))
        .filter(Boolean) as string[];
      onMentionsChange(mentions);
    },
    [onMentionsChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        code: {
          HTMLAttributes: {
            class:
              'bg-muted px-1.5 py-0.5 rounded font-mono text-red-500 dark:text-red-300 dark:font-medium',
          },
        },
      }),
      // Custom CodeBlock with language selector
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(
            CodeBlockComponent as React.ComponentType<ReactNodeViewProps<HTMLElement>>
          );
        },
      }).configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-muted border border-border rounded-lg my-4 overflow-hidden',
        },
        languageClassPrefix: 'language-',
        defaultLanguage: 'plaintext',
      }),

      ListItem.configure({
        HTMLAttributes: {
          class: 'leading-normal my-1',
        },
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc pl-6 my-2',
        },
        keepMarks: true,
        keepAttributes: true,
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal pl-6 my-2',
        },
        keepMarks: true,
        keepAttributes: true,
      }),

      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:text-primary/80 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            'inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-2000 transition-colors',
        },
        suggestion: {
          items: async ({ query }) => {
            return await searchUsers(query);
          },
          render: () => {
            let component: ReactRenderer<MentionSuggestionRef>;
            let popup: TippyInstance[];

            return {
              onStart: props => {
                component = new ReactRenderer(MentionSuggestion, {
                  props: {
                    ...props,
                    command: (item: MentionUser) => {
                      props.command({
                        id: item.id,
                        label: item.name,
                      });
                    },
                  },
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  theme: 'mention',
                  maxWidth: 300,
                  offset: [0, 8],
                  zIndex: 9999,
                });
              },

              onUpdate(props) {
                component.updateProps({
                  ...props,
                  command: (item: MentionUser) => {
                    const mentionData = {
                      id: item.id,
                      label: item.name,
                    };
                    props.command(mentionData);
                  },
                });

                if (!props.clientRect) {
                  return;
                }

                popup[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0]?.hide();
                  return true;
                }

                return component.ref?.onKeyDown(props) || false;
              },

              onExit() {
                popup[0]?.destroy();
                component.destroy();
              },
            };
          },
        },
      }),
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      extractMentions(html);
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3 rounded-md border border-input bg-background transition-all duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring',
        'data-placeholder': placeholder,
      },
      handleKeyDown: (view, event) => {
        // Add code block shortcut
        if (event.key === '`') {
          const { state } = view;
          const { from } = state.selection;
          const textBefore = state.doc.textBetween(Math.max(0, from - 2), from);

          // If we already have two backticks before, create a code block
          if (textBefore === '``') {
            event.preventDefault();
            // Delete the two backticks and create a code block
            editor
              ?.chain()
              .focus()
              .deleteRange({ from: from - 2, to: from })
              .toggleCodeBlock()
              .run();
            return true;
          }
        }
        if (event.key === 'Enter' && event.ctrlKey && event.altKey) {
          editor?.chain().focus().toggleCodeBlock().run();
          return true;
        }

        if (onKeyDown) {
          const syntheticEvent = new KeyboardEvent('keydown', {
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          });
          onKeyDown(syntheticEvent as any);
        }
        return false;
      },
    },
  });

  // Update content when prop changes
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="rich-text-editor">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
