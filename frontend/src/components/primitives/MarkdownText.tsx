// frontend/src/components/primitives/MarkdownText.tsx
// Renders markdown text from Genie (bold, italics, code, bullet lists, links, paragraphs).

import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  // Regex to match **bold**, *italic*, `code`, [link](url)
  const regex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-text">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-sunken text-mono text-caption text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary-hover font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}

export function MarkdownText({ content, className = "" }: MarkdownTextProps) {
  if (!content) return null;

  // Normalize single linebreaks before list markers to double linebreaks
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\n(-|\*|\d+\.) /g, "$1\n\n$2 ");

  const blocks = normalized.split(/\n\n+/);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split(/\n+/);
        const isList = lines.length > 0 && lines.every((l) => /^[-*]\s+|\d+\.\s+/.test(l.trim()));

        if (isList) {
          return (
            <ul key={bIdx} className="list-disc pl-5 flex flex-col gap-1 my-1">
              {lines.map((line, lIdx) => {
                const cleanLine = line.trim().replace(/^[-*]\s+|\d+\.\s+/, "");
                return (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInline(cleanLine)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={bIdx} className="leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
