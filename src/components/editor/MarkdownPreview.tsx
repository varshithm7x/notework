/**
 * Markdown Preview
 * 
 * Renders markdown content as styled HTML using the `marked` library.
 * Processes [[wiki-links]] and #tags into clickable elements.
 * Uses DOMPurify for XSS protection.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import DOMPurify from 'dompurify';

// Enable math formatting
marked.use(markedKatex({ throwOnError: false }));

interface MarkdownPreviewProps {
  content: string;
  onLinkClick: (linkName: string) => void;
}

export function MarkdownPreview({ content, onLinkClick }: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Configure marked for GFM (GitHub Flavored Markdown) support
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Process wiki-links before markdown parsing
    let processed = content.replace(
      /\[\[([^\]]+)\]\]/g,
      '<a class="wiki-link" data-link="$1" href="#">$1</a>'
    );

    // Process tags
    processed = processed.replace(
      /(?:^|\s)(#[a-zA-Z][a-zA-Z0-9_-]*)/gm,
      ' <span class="tag" data-tag="$1">$1</span>'
    );

    // Parse markdown to HTML
    const html = marked.parse(processed, {
      gfm: true,
      breaks: true,
    }) as string;

    // Sanitize to prevent XSS, but allow our custom attributes and katex math elements
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ['data-link', 'data-tag'],
      ADD_TAGS: ['span', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'mspace', 'msqrt', 'mfrac', 'table', 'tbody', 'tr', 'mtd', 'mtr', 'annotation'],
    });
  }, [content]);

  // Handle clicks on wiki-links and tags
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;

      // Handle wiki-link clicks
      if (target.classList.contains('wiki-link')) {
        e.preventDefault();
        e.stopPropagation();
        const linkName = target.getAttribute('data-link');
        if (linkName) {
          onLinkClick(linkName);
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [onLinkClick]);

  return (
    <div
      ref={previewRef}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}
