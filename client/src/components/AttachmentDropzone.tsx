import React, { useRef } from 'react';
import { Paperclip, X } from 'lucide-react';

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv'];

interface AttachmentDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  error: string;
  onErrorChange: (message: string) => void;
  allowedTypes?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  helperText?: string;
}

export default function AttachmentDropzone({
  files,
  onFilesChange,
  error,
  onErrorChange,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxFiles = 5,
  maxSizeMB = 5,
  label = 'Attachments',
  helperText,
}: AttachmentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedHelperText = helperText || `Up to ${maxSizeMB}MB, max ${maxFiles} files`;

  const handleFilesSelected = (fileList: FileList | null) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted: File[] = [];
    let nextError = '';

    for (const file of incoming) {
      if (!allowedTypes.includes(file.type)) {
        nextError = 'One or more files have an unsupported type.';
        continue;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        nextError = `Each file must be under ${maxSizeMB}MB.`;
        continue;
      }
      accepted.push(file);
    }

    const combined = [...files, ...accepted];
    if (combined.length > maxFiles) {
      nextError = `You can attach up to ${maxFiles} files.`;
      onFilesChange(combined.slice(0, maxFiles));
    } else {
      onFilesChange(combined);
    }
    onErrorChange(nextError);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    onErrorChange('');
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] sm:text-[11px] font-pmedium text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={allowedTypes.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilesSelected(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-white hover:bg-slate-50 hover:border-[#2563EB] transition-colors cursor-pointer group"
      >
        <div className="w-12 h-12 bg-blue-50 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Paperclip className="text-[#2563EB]" size={20} />
        </div>
        <p className="text-[12px] sm:text-[13px] font-pmedium text-[#0F172A]">Upload screenshot or document</p>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">{resolvedHelperText}</p>
      </div>
      {error ? (
        <p className="text-[10px] sm:text-[11px] text-red-500 font-pmedium">{error}</p>
      ) : null}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg pl-2.5 pr-1.5 py-1 text-[11px] font-pmedium max-w-[220px]">
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-500"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
