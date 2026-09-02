// frontend/src/components/data/Card.tsx
// Per ui-registry.md: static / clickable variants. Universal anatomy order enforced.
// Clickable: single stretched link wrapping — no nested interactives.

import type { ReactNode } from "react";

interface BaseCardProps {
  children: ReactNode;
  className?: string;
}

interface StaticCardProps extends BaseCardProps {
  variant?: "static";
}

interface ClickableCardProps extends BaseCardProps {
  variant: "clickable";
  /** Stretched link href — the entire card is the link. No nested interactive elements allowed. */
  href: string;
  label: string; // Accessible label for the card link
}

export type CardProps = StaticCardProps | ClickableCardProps;

const cardBase = [
  "bg-surface rounded-lg border border-border",
  "shadow-raised",
  "p-4",
  "flex flex-col gap-3",
].join(" ");

export function Card(props: CardProps) {
  if (props.variant === "clickable") {
    return (
      <article className={`${cardBase} relative group ${props.className ?? ""}`}>
        <a
          href={props.href}
          aria-label={props.label}
          className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        />
        <div className="transition-colors duration-fast group-hover:text-primary">
          {props.children}
        </div>
      </article>
    );
  }

  return (
    <div className={`${cardBase} ${props.className ?? ""}`}>
      {props.children}
    </div>
  );
}
