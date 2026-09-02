// frontend/src/components/primitives/FormField.tsx
// Label + input + helper/error text. Variants: text / select / date / time.
// Per ui-registry.md: visible label always above input. Error replaces helper text.
// aria-invalid + aria-describedby wired on all variants.

import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

type InputVariant = "text" | "date" | "time";

interface BaseFieldProps {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
}

interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  variant: InputVariant;
}

interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  variant: "select";
  options: { value: string; label: string }[];
}

export type FormFieldProps = InputFieldProps | SelectFieldProps;

const inputClass = [
  "w-full min-h-control-md px-3 rounded-md border border-border",
  "bg-surface text-body text-text",
  "transition-colors duration-fast ease-standard",
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
  "disabled:bg-surface-sunken disabled:text-text-disabled disabled:cursor-not-allowed",
].join(" ");

const errorInputClass = "border-error focus:ring-error";

export function FormField(props: FormFieldProps) {
  const { id, label, helperText, error, required, variant, ...rest } = props;
  const descId = `${id}-desc`;
  const hasDesc = !!(helperText || error);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label font-medium text-text">
        {label}
        {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
      </label>

      {variant === "select" ? (
        <select
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={hasDesc ? descId : undefined}
          className={`${inputClass} ${error ? errorInputClass : ""}`}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as SelectFieldProps).options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={variant}
          required={required}
          aria-invalid={!!error}
          aria-describedby={hasDesc ? descId : undefined}
          className={`${inputClass} ${error ? errorInputClass : ""}`}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {hasDesc && (
        <p
          id={descId}
          className={`text-caption ${error ? "text-error" : "text-text-muted"}`}
          role={error ? "alert" : undefined}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}
