// frontend/src/components/campus/InternshipCard.tsx
// Displays an internship opportunity in Almanac's design language.

import { Calendar, MapPin, ExternalLink, Briefcase, Award } from "lucide-react";
import type { InternshipSummary } from "../../api/client";
import { formatDate } from "../../lib/formatTime";

interface InternshipCardProps {
  internship: InternshipSummary;
}

export function InternshipCard({ internship }: InternshipCardProps) {
  const isOpen = internship.status === "open";

  return (
    <article className="bg-surface rounded-lg border border-border shadow-raised p-4 flex flex-col gap-3 group hover:shadow-elevated transition-shadow duration-base ease-standard">
      {/* Header row: Company name + Status */}
      <div className="flex items-center justify-between gap-2 h-6">
        <span className="text-label font-semibold text-primary tracking-wide">
          {internship.company_name}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium ${
            isOpen
              ? "bg-success-subtle text-success"
              : "bg-surface-sunken text-text-muted"
          }`}
        >
          {isOpen ? "Active" : "Closed"}
        </span>
      </div>

      {/* Role title — Playfair Display */}
      <h3 className="font-display text-h2 font-medium text-text leading-snug line-clamp-2">
        {internship.role_title}
      </h3>

      {/* Stipend if available */}
      {internship.stipend && (
        <div className="flex items-center gap-1.5 text-label font-semibold text-text">
          <Award size={14} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
          <span>{internship.stipend}</span>
        </div>
      )}

      {/* Location & Eligibility */}
      <div className="flex flex-col gap-1.5 text-label text-text-muted">
        <div className="flex items-center gap-1.5">
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate">{internship.location}</span>
        </div>
        {internship.eligibility && (
          <div className="flex items-center gap-1.5">
            <Briefcase size={14} strokeWidth={1.5} aria-hidden="true" />
            <span className="truncate">{internship.eligibility}</span>
          </div>
        )}
      </div>

      {/* Deadline & Apply Action */}
      <div className="mt-auto pt-3 border-t border-divider flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-caption text-text-muted">
          <Calendar size={13} strokeWidth={1.5} aria-hidden="true" />
          <span>Deadline: {formatDate(internship.deadline_ts)}</span>
        </div>

        {internship.apply_url && isOpen && (
          <a
            href={internship.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-label font-semibold text-primary hover:text-primary-hover hover:underline transition-colors"
            aria-label={`Apply for ${internship.role_title} at ${internship.company_name}`}
          >
            <span>Apply</span>
            <ExternalLink size={12} strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
