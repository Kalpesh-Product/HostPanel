import React, { useRef, useState } from "react";
import { Download, UploadCloud, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createVirtualOffice, recordVirtualOfficeRentPayment } from "../../../services/virtual-offices";
import {
  readSpreadsheetRows,
  isBulkRowEmpty,
  buildBulkVirtualOfficePayload,
  buildBulkVirtualOfficePaymentRow,
  downloadVirtualOfficeCompanyTemplate,
  downloadVirtualOfficeRentTemplate,
} from "./virtualOfficeBulkUtils";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const COPY = {
  companies: {
    title: "Upload Virtual Office Companies",
    description: "Bring in companies from a spreadsheet — one row per company. Required fields are marked on the template's Required Fields sheet.",
    successNoun: "compan",
    successNounPlural: "ies",
    successNounSingular: "y",
  },
  payments: {
    title: "Upload Rent Collections & Payments",
    description: "Bulk-record rent payments against existing virtual office companies. Match each row to a company by its Record Code or Client Name.",
    successNoun: "payment",
    successNounPlural: "s",
    successNounSingular: "",
  },
};

/**
 * type: "companies" | "payments"
 * records: current virtual office list — required for "payments" to resolve
 *   each row's company, and to seed the "Company Reference" template sheet.
 */
export default function VirtualOfficeBulkUploadModal({ open, type = "companies", records = [], onClose, onImported }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  if (!open) return null;
  const copy = COPY[type] || COPY.companies;

  const resetState = () => {
    setError("");
    setSummary(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose?.();
  };

  const downloadTemplate = () => {
    if (type === "payments") downloadVirtualOfficeRentTemplate(records);
    else downloadVirtualOfficeCompanyTemplate();
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSummary(null);
    setFileName(file.name);
    setIsImporting(true);

    try {
      const rows = await readSpreadsheetRows(file);
      const nonEmptyRows = rows.filter((row) => !isBulkRowEmpty(row));
      if (nonEmptyRows.length === 0) {
        throw new Error(`No ${type === "payments" ? "payment" : "company"} rows found in the file.`);
      }

      let created = 0;
      const failedRows = [];

      for (const [index, row] of nonEmptyRows.entries()) {
        const built = type === "payments"
          ? buildBulkVirtualOfficePaymentRow(row, records)
          : buildBulkVirtualOfficePayload(row);

        if (!built.payload) {
          failedRows.push(`Row ${index + 2}: ${built.error}`);
          continue;
        }

        let lastError = null;
        let succeeded = false;
        for (let attempt = 1; attempt <= 3 && !succeeded; attempt += 1) {
          try {
            if (type === "payments") {
              await recordVirtualOfficeRentPayment(built.companyId, built.payload);
            } else {
              await createVirtualOffice(built.payload);
            }
            created += 1;
            succeeded = true;
          } catch (err) {
            lastError = err;
            const isNetworkError = !err?.response;
            if (!isNetworkError || attempt === 3) break;
            await sleep(500 * attempt);
          }
        }

        if (!succeeded) {
          const label = type === "payments" ? (built.companyLabel || `Row ${index + 2}`) : `Row ${index + 2}`;
          failedRows.push(`Row ${index + 2} (${label}): ${lastError?.response?.data?.message || lastError?.message || "Unable to save."}`);
        }
      }

      setSummary({ fileName: file.name, created, failed: failedRows.length, errors: failedRows });

      if (created > 0) {
        onImported?.();
        toast.success(`Imported ${created} ${copy.successNoun}${created === 1 ? copy.successNounSingular : copy.successNounPlural} from bulk upload.`);
      }
      if (failedRows.length > 0) {
        setError(failedRows[0]);
      }
    } catch (err) {
      const message = err.message || "Unable to read the uploaded file.";
      setError(message);
      toast.error(message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelected} className="hidden" />
      <div className="w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-blue-50/30 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base lg:text-lg font-pmedium text-slate-800">{copy.title}</h2>
            <p className="mt-1.5 max-w-xl text-[12px] font-pmedium text-slate-500">{copy.description}</p>
          </div>
          <button type="button" onClick={handleClose} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <button type="button" onClick={downloadTemplate} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-pmedium uppercase tracking-widest text-slate-700 transition-all hover:border-slate-300 hover:bg-white">
              <Download size={14} /> Download template
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] font-pmedium uppercase tracking-widest text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100">
              <UploadCloud size={14} /> Choose file
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
            <p className="text-[9px] font-pmedium uppercase tracking-[0.3em] text-slate-400">Template rules</p>
            <div className="mt-2 grid gap-2 text-[12px] text-slate-700 md:grid-cols-2">
              {type === "payments" ? (
                <>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Use one row per payment.</p>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Company must match an existing record's Record Code or Client Name.</p>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">The template's "Company Reference" sheet lists valid values.</p>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Amount is required; everything else is optional.</p>
                </>
              ) : (
                <>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Use one row per company.</p>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Client Name, HO/Local POC name, desks, rate, term and dates are required.</p>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Dates use YYYY-MM-DD.</p>
                  <p className="rounded-xl bg-white px-3 py-2 font-pmedium shadow-sm">Space location/floor/wing can be adjusted later against Resource Management.</p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-pmedium uppercase tracking-[0.3em] text-slate-400">Selected file</p>
                <h3 className="mt-0.5 text-[13px] font-pmedium text-slate-900">{fileName || "No file selected yet"}</h3>
              </div>
              {isImporting && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-widest text-blue-700">Importing</span>
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
                  <p className="mt-0.5 text-[12px] font-pmedium text-slate-900 break-all">{summary.fileName}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-pmedium uppercase tracking-widest text-rose-700">
                {error}
              </div>
            )}

            {summary?.errors?.length > 0 && (
              <div className="mt-3 max-h-36 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[9px] font-pmedium uppercase tracking-widest text-amber-700">Row errors</p>
                <ul className="mt-1.5 space-y-1 text-[11px] font-pmedium text-amber-800">
                  {summary.errors.map((errorText) => (
                    <li key={errorText}>{errorText}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={handleClose} className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-slate-700 transition-all hover:bg-slate-200">
                Close
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-widest text-white transition-all hover:bg-blue-700 disabled:opacity-50">
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isImporting ? "Importing..." : "Select file"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
