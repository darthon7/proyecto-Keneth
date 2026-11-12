import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = '', id, ...rest }: TextareaProps) {
  const textareaId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-body-sm font-semibold text-[#0F172A]">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full resize-y rounded-lg border bg-[#FFFFFF] px-4 py-3 text-body-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#FF2A5F]/20 transition-colors ${
          error ? 'border-[#EF4444]' : 'border-[#E2E8F0] focus:border-[#1E1B4B]'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-caption text-[#EF4444]">{error}</p>
      ) : hint ? (
        <p className="text-caption text-[#475569]">{hint}</p>
      ) : null}
    </div>
  );
}
