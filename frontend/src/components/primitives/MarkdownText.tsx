// frontend/src/components/primitives/MarkdownText.tsx
// Renders markdown text from Genie (bold, italics, code, bullet lists, links, paragraphs).
// Supports in-app event registration links like [Register for AI Workshop](#register:evt_001).

import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
  onRegisterClick?: (eventId: string) => void;
}

function renderInline(text: string, onRegisterClick?: (eventId: string) => void): React.ReactNode[] {
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
      const label = linkMatch[1];
      const url = linkMatch[2];

      // If it's an in-app registration link (#register:evt_xxx or register?event=evt_xxx)
      if (url.startsWith("#register:") && onRegisterClick) {
        const eventId = url.replace("#register:", "").trim();
        return (
          <button
            key={i}
            type="button"
            onClick={() => onRegisterClick(eventId)}
            className="text-primary underline hover:text-primary-hover font-semibold inline-flex items-center gap-0.5 cursor-pointer"
          >
            {label}
          </button>
        );
      }

      return (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary-hover font-medium"
        >
          {label}
        </a>
      );
    }
    return part;
  });
}

export function MarkdownText({ content, className = "", onRegisterClick }: MarkdownTextProps) {
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
                    {renderInline(cleanLine, onRegisterClick)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={bIdx} className="leading-relaxed">
            {renderInline(trimmed, onRegisterClick)}
          </p>
        );
      })}
    </div>
  );
}
