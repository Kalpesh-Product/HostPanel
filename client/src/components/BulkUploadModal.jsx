import React from "react";
import { Download, UploadCloud, X, Loader2 } from "lucide-react";

/**
 * Shared bulk-upload modal shell — the design introduced for Tenant Companies
 * and Virtual Offices bulk imports. Purely presentational: every page keeps
 * owning its own file-parsing/import logic and just wires state through props.
 *
 * Two flows are supported:
 *  - Immediate import: omit `staged`/`onConfirmImport` — picking a file calls
 *    `onFileChange` and the parent starts importing right away.
 *  - Preview + confirm: pass `staged` (true once a file is picked but not yet
 *    imported) plus `onConfirmImport` and `onChangeFile` — the footer then
 *    shows "Change file" / "Import" instead of "Select file".
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {{ current: HTMLInputElement | null }} props.fileInputRef
 * @param {string} [props.accept]
 * @param {(event: any) => void} props.onFileChange
 * @param {() => void} props.onDownloadTemplate
 * @param {string} [props.downloadLabel]
 * @param {string} [props.rulesTitle]
 * @param {string[]} [props.rules]
 * @param {string} [props.fileName]
 * @param {boolean} [props.isImporting]
 * @param {string} [props.importingLabel]
 * @param {boolean} [props.staged]
 * @param {string} [props.stagedInfo]
 * @param {() => void} [props.onConfirmImport]
 * @param {() => void} [props.onChangeFile]
 * @param {{ created: number, failed: number, fileName?: string, errors?: string[] } | null} [props.summary]
 * @param {string} [props.error]
 * @param {string[]} [props.errors]
 * @param {string} [props.selectLabel]
 * @param {string} [props.importLabel]
 */
export default function BulkUploadModal({
  open,
  onClose,
  title,
  description,
  fileInputRef,
  accept = ".xlsx,.xls,.csv",
  onFileChange,
  onDownloadTemplate,
  downloadLabel = "Download template",
  rulesTitle = "Template rules",
  rules = /** @type {string[]} */ ([]),
  fileName,
  isImporting = false,
  importingLabel = "Importing...",
  staged = false,
  stagedInfo,
  onConfirmImport,
  onChangeFile,
  summary,
  error,
  errors,
  selectLabel = "Select file",
  importLabel = "Import",
}) {
  if (!open) return null;

  const rowErrors = errors && errors.length ? errors : summary?.errors;
  const showConfirmFooter = staged && !summary;

  const openPicker = () => fileInputRef?.current?.click();

  const handleClose = () => {
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="hidden"
      />
      <div className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base lg:text-lg font-pmedium text-slate-800">{title}</h2>
            {description && (
              <p className="mt-1.5 max-w-xl text-[12px] font-pmedium text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-pmedium uppercase tracking-widest text-slate-700 transition-all hover:border-slate-300 hover:bg-white"
            >
              <Download size={14} /> {downloadLabel}
            </button>
            <button
              type="button"
              onClick={openPicker}
              disabled={isImporting}
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-pmedium uppercase tracking-widest text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50"
            >
              <UploadCloud size={14} /> Choose file
            </button>
          </div>

          {rules.length > 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
              <p className="text-[9px] font-pmedium uppercase tracking-[0.3em] text-slate-400">{rulesTitle}</p>
              <div className="mt-2 grid gap-2 text-[12px] text-slate-700 md:grid-cols-2">
                {rules.map((rule, index) => (
                  <p key={index} className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-pmedium uppercase tracking-[0.3em] text-slate-400">Selected file</p>
                <h3 className="mt-0.5 text-[13px] font-pmedium text-slate-900 truncate">{fileName || "No file selected yet"}</h3>
                {stagedInfo && !isImporting && (
                  <p className="mt-0.5 text-[11px] font-pmedium text-slate-500">{stagedInfo}</p>
                )}
              </div>
              {isImporting ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-blue-700 shrink-0">Importing</span>
              ) : (
                showConfirmFooter && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-amber-700 shrink-0">Staged</span>
                )
              )}
            </div>

            {summary && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Created</p>
                  <p className="mt-0.5 text-[13px] font-pmedium text-slate-900">{summary.created}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Failed</p>
                  <p className="mt-0.5 text-[13px] font-pmedium text-slate-900">{summary.failed}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">File</p>
                  <p className="mt-0.5 text-[12px] font-pmedium text-slate-900 break-all">{summary.fileName || fileName}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-rose-700">
                {error}
              </div>
            )}

            {rowErrors?.length > 0 && (
              <div className="mt-3 max-h-36 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-amber-700">Row errors</p>
                <ul className="mt-1.5 space-y-1 text-[11px] font-pmedium text-amber-800">
                  {rowErrors.map((errorText, index) => (
                    <li key={index}>{errorText}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {showConfirmFooter ? (
                <>
                  <button
                    type="button"
                    onClick={onChangeFile}
                    disabled={isImporting}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200 disabled:opacity-50"
                  >
                    Change file
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmImport}
                    disabled={isImporting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isImporting ? importingLabel : importLabel}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={openPicker}
                    disabled={isImporting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isImporting ? importingLabel : selectLabel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
