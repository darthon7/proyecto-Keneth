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
        <label htmlFor={textareaId} className="text-body-sm font-semibold text-white">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full resize-y rounded-[4px] bg-graphite px-4 py-3 text-body-sm text-white placeholder:text-fog focus:bg-[#3a3a3a] focus:outline-none ${
          error ? 'border border-[#ff7b7b]' : ''
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p className="text-caption text-[#ff7b7b]">{error}</p>
      ) : hint ? (
        <p className="text-caption text-fog">{hint}</p>
      ) : null}
    </div>
  );
}
