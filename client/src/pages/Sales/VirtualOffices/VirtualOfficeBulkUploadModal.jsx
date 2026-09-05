import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { createVirtualOffice, recordVirtualOfficeRentPayment } from "../../../services/virtual-offices";
import BulkUploadModal from "../../../components/BulkUploadModal";
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
    rules: [
      "Use one row per company.",
      "Client Name, HO/Local POC name, desks, rate, term and dates are required.",
      "Dates use YYYY-MM-DD.",
      "Space location/floor/wing can be adjusted later against Resource Management.",
    ],
  },
  payments: {
    title: "Upload Rent Collections & Payments",
    description: "Bulk-record rent payments against existing virtual office companies. Match each row to a company by its Record Code or Client Name.",
    successNoun: "payment",
    successNounPlural: "s",
    successNounSingular: "",
    rules: [
      "Use one row per payment.",
      "Company must match an existing record's Record Code or Client Name.",
      "The template's \"Company Reference\" sheet lists valid values.",
      "Amount is required; everything else is optional.",
    ],
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
  const [stagedRows, setStagedRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  if (!open) return null;
  const copy = COPY[type] || COPY.companies;

  const resetState = () => {
    setError("");
    setSummary(null);
    setFileName("");
    setStagedRows([]);
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
    setStagedRows([]);
    setIsImporting(true);

    try {
      const rows = await readSpreadsheetRows(file);
      const nonEmptyRows = rows.filter((row) => !isBulkRowEmpty(row));
      if (nonEmptyRows.length === 0) {
        throw new Error(`No ${type === "payments" ? "payment" : "company"} rows found in the file.`);
      }

      setStagedRows(nonEmptyRows);
    } catch (err) {
      const message = err.message || "Unable to read the uploaded file.";
      setError(message);
      toast.error(message);
      setFileName("");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangeFile = () => {
    setFileName("");
    setStagedRows([]);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (stagedRows.length === 0) return;

    setIsImporting(true);
    setError("");

    let created = 0;
    const failedRows = [];

    for (const [index, row] of stagedRows.entries()) {
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

    setSummary({ fileName, created, failed: failedRows.length, errors: failedRows });

    if (created > 0) {
      onImported?.();
      toast.success(`Imported ${created} ${copy.successNoun}${created === 1 ? copy.successNounSingular : copy.successNounPlural} from bulk upload.`);
    }
    if (failedRows.length > 0) {
      setError(failedRows[0]);
    }
    setIsImporting(false);
  };

  return (
    <BulkUploadModal
      open={open}
      onClose={handleClose}
      title={copy.title}
      description={copy.description}
      fileInputRef={fileInputRef}
      onFileChange={handleFileSelected}
      onDownloadTemplate={downloadTemplate}
      rules={copy.rules}
      fileName={fileName}
      isImporting={isImporting}
      staged={stagedRows.length > 0 && !summary}
      stagedInfo={`${stagedRows.length} row${stagedRows.length === 1 ? "" : "s"} detected`}
      onConfirmImport={handleConfirmImport}
      onChangeFile={handleChangeFile}
      importLabel={`Import ${stagedRows.length} Row${stagedRows.length === 1 ? "" : "s"}`}
      summary={summary}
      error={error}
    />
  );
}
