'use client';

import { useEffect } from 'react';
import { createLowlight, common } from 'lowlight';

// Import the same languages as in RichTextEditor
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import bash from 'highlight.js/lib/languages/bash';
import hljs from 'highlight.js';

// Create lowlight instance
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

export function useSyntaxHighlighting(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!containerRef.current) return;

    const highlightCodeBlocks = () => {
      const codeBlocks = containerRef.current?.querySelectorAll('pre code');

      codeBlocks?.forEach(block => {
        const codeElement = block as HTMLElement;
        const preElement = codeElement.parentElement as HTMLPreElement;

        // Skip if already highlighted
        if (codeElement.dataset.highlighted === 'true') return;

        // Get language from class attribute
        const classNames = codeElement.className;
        const languageMatch = classNames.match(/language-(\w+)/);
        const language = languageMatch ? languageMatch[1] : 'plaintext';

        try {
          // Get the code content

          // Apply syntax highlighting
          if (language) {
            if (language && hljs.getLanguage(language)) {
              const result = hljs.highlight(codeElement.textContent || '', { language });
              codeElement.innerHTML = result.value;
            } else {
              // Auto-detect language
              const result = hljs.highlightAuto(codeElement.textContent || '');
              codeElement.innerHTML = result.value;
            }

            codeElement.dataset.highlighted = 'true';

            // Add proper styling classes to the pre element
            if (preElement) {
              preElement.classList.add('code-block-content');
              preElement.dataset.language = language || 'auto';
            }
          }
        } catch (error) {
          console.warn('Failed to highlight code block:', error);
          // Mark as highlighted to prevent infinite retries
          codeElement.dataset.highlighted = 'true';
        }
      });
    };

    // Initial highlighting
    highlightCodeBlocks();

    // Set up a mutation observer to handle dynamically added content
    const observer = new MutationObserver(mutations => {
      let shouldHighlight = false;

      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldHighlight = true;
        }
      });

      if (shouldHighlight) {
        // Debounce highlighting
        setTimeout(highlightCodeBlocks, 100);
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);
}
