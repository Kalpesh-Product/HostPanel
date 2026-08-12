import type { ChangeEvent, ReactNode } from "react";

// Text input for the website builder's page tabs, styled to match the rest
// of the dashboard (Attendance/Employee/Leave/Company pages use a plain
// labeled input rather than MUI TextField). Accepts an RHF `field` object
// (Controller), a `registration` object (register()), or a plain
// value/onChange pair, so it drops straight into any existing wiring.
interface RHFField {
  value: any;
  onChange: (...args: any[]) => void;
  onBlur?: () => void;
  name?: string;
  ref?: any;
}

interface RHFRegistration {
  name: string;
  onChange: (...args: any[]) => void;
  onBlur: (...args: any[]) => void;
  ref: any;
}

interface WebsiteFormFieldProps {
  label?: string;
  field?: RHFField;
  registration?: RHFRegistration;
  value?: any;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: () => void;
  name?: string;
  inputRef?: any;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  minRows?: number;
  maxLength?: number;
  type?: string;
  min?: number;
  max?: number;
  step?: number | string;
  helperText?: ReactNode;
  error?: boolean;
  required?: boolean;
  select?: boolean;
  children?: ReactNode;
}

const WebsiteFormField = ({
  label,
  field,
  registration,
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  placeholder,
  disabled,
  multiline,
  minRows = 3,
  maxLength,
  type = "text",
  min,
  max,
  step,
  helperText,
  error,
  required,
  select,
  children,
}: WebsiteFormFieldProps) => {
  const inputClass = `mt-1 w-full px-3.5 py-2.5 bg-white border rounded-xl text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 ${
    error ? "border-red-300 bg-red-50" : "border-slate-200/60"
  }`;

  // register() usage is uncontrolled (no `value`), everything else is controlled.
  const commonProps = registration
    ? { ...registration }
    : {
        name: field ? field.name : name,
        ref: field ? field.ref : inputRef,
        value: field ? field.value ?? "" : value ?? "",
        onChange: (field ? field.onChange : onChange) as any,
        onBlur: field ? field.onBlur : onBlur,
      };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {label ? (
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
          {label}
          {required ? <span className="text-red-400"> *</span> : null}
        </label>
      ) : null}
      {select ? (
        <select {...commonProps} disabled={disabled} className={`${inputClass} cursor-pointer`}>
          {children}
        </select>
      ) : multiline ? (
        <textarea
          {...commonProps}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={minRows}
          className={`${inputClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          {...commonProps}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          className={inputClass}
        />
      )}
      {helperText ? (
        <span
          className={`mt-1 text-[10px] font-medium ${
            error ? "text-red-500" : "text-slate-400"
          }`}
        >
          {helperText}
        </span>
      ) : null}
    </div>
  );
};

export default WebsiteFormField;
