'use client';

import React from 'react';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewProps } from '@tiptap/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CodeBlockComponentProps extends Omit<ReactNodeViewProps, 'extension'> {
  extension: {
    options: {
      lowlight: {
        listLanguages: () => string[];
      };
    };
  };
}

const CodeBlockComponent: React.FC<CodeBlockComponentProps> = ({
  node: {
    attrs: { language: defaultLanguage },
  },
  updateAttributes,
  extension,
}) => {
  const languages = extension.options.lowlight.listLanguages();

  // Common languages to show at the top
  const commonLanguages = [
    'javascript',
    'typescript',
    'python',
    'html',
    'css',
    'json',
    'sql',
    'bash',
  ];

  // Sort languages: common ones first, then alphabetically
  const sortedLanguages = [
    ...commonLanguages.filter(lang => languages.includes(lang)),
    ...languages.filter(lang => !commonLanguages.includes(lang)).sort(),
  ];

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <Select
          value={defaultLanguage || 'null'}
          onValueChange={value => updateAttributes({ language: value === 'null' ? null : value })}
        >
          <SelectTrigger className="w-32 h-7 text-xs" contentEditable={false}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">auto</SelectItem>
            <SelectItem value="plaintext">plain text</SelectItem>
            <div className="border-t border-border my-1" />
            {sortedLanguages.map(lang => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <pre className="code-block-content">
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
