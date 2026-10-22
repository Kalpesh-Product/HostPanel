import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, FileText, Maximize2, Paperclip, X } from "lucide-react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

export type PreviewAttachment = {
  id?: string;
  url: string;
  name?: string;
  type?: string;
  file?: File;
};

type AttachmentKind = "image" | "pdf" | "csv" | "other";

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|webp|gif|bmp|svg|avif|heic)(?:[?#].*)?$/i;
const PDF_EXTENSION_PATTERN = /\.pdf(?:[?#].*)?$/i;
const CSV_EXTENSION_PATTERN = /\.csv(?:[?#].*)?$/i;

const getAttachmentKind = (attachment: PreviewAttachment): AttachmentKind => {
  const type = (attachment.type || "").toLowerCase();
  const name = attachment.name || "";
  const url = attachment.url || "";

  if (type.startsWith("image/") || IMAGE_EXTENSION_PATTERN.test(name) || IMAGE_EXTENSION_PATTERN.test(url)) {
    return "image";
  }
  if (type === "application/pdf" || PDF_EXTENSION_PATTERN.test(name) || PDF_EXTENSION_PATTERN.test(url)) {
    return "pdf";
  }
  if (type.includes("csv") || CSV_EXTENSION_PATTERN.test(name) || CSV_EXTENSION_PATTERN.test(url)) {
    return "csv";
  }
  return "other";
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
};

type AttachmentViewerProps = {
  attachment: PreviewAttachment | null;
  onClose: () => void;
};

function AttachmentViewer({ attachment, onClose }: AttachmentViewerProps) {
  const axios = useAxiosPrivate();
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvStatus, setCsvStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const kind = attachment ? getAttachmentKind(attachment) : "other";

  useEffect(() => {
    if (!attachment) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attachment, onClose]);

  useEffect(() => {
    if (!attachment || kind !== "csv") {
      setCsvRows([]);
      setCsvStatus("idle");
      return;
    }

    let active = true;
    setCsvRows([]);
    setCsvStatus("loading");

    const loadCsv = async () => {
      try {
        let text: string;
        if (attachment.file) {
          text = await attachment.file.text();
        } else {
          const response = await axios.get("/api/tickets/attachments/file", {
            params: { url: attachment.url },
            responseType: "text",
            transformResponse: [(data) => data],
          });
          text = typeof response.data === "string" ? response.data : String(response.data ?? "");
        }
        if (!active) return;
        setCsvRows(parseCsv(text));
        setCsvStatus("ready");
      } catch {
        if (active) setCsvStatus("error");
      }
    };

    void loadCsv();
    return () => {
      active = false;
    };
  }, [attachment, axios, kind]);

  if (!attachment) return null;

  const title = attachment.name || "Attachment";

  return createPortal(
    <div
      className="fixed inset-0 z-[130] bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} preview`}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {kind === "csv" ? (
              <FileSpreadsheet size={16} className="shrink-0 text-emerald-600" />
            ) : (
              <FileText size={16} className="shrink-0 text-slate-500" />
            )}
            <p className="truncate text-[12px] font-pmedium text-slate-700">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={attachment.url}
              download={attachment.name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label={`Download ${title}`}
            >
              <Download size={15} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {kind === "image" ? (
          <div className="flex max-h-[80vh] items-center justify-center overflow-auto bg-slate-950 p-3">
            <img src={attachment.url} alt={title} className="max-h-[76vh] max-w-full object-contain" />
          </div>
        ) : null}

        {kind === "pdf" ? (
          <div className="h-[78vh] w-full bg-slate-100">
            <iframe src={attachment.url} title={title} className="h-full w-full border-0" />
          </div>
        ) : null}

        {kind === "csv" ? (
          <div className="max-h-[78vh] overflow-auto bg-white">
            {csvStatus === "loading" ? (
              <p className="p-6 text-[12px] font-pmedium text-slate-400">Loading CSV preview...</p>
            ) : null}
            {csvStatus === "error" ? (
              <div className="p-6">
                <p className="text-[12px] font-pmedium text-slate-500">Unable to preview this CSV inline.</p>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-pmedium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Download size={13} /> Open CSV file
                </a>
              </div>
            ) : null}
            {csvStatus === "ready" && csvRows.length === 0 ? (
              <p className="p-6 text-[12px] font-pmedium text-slate-400">This CSV file is empty.</p>
            ) : null}
            {csvStatus === "ready" && csvRows.length > 0 ? (
              <table className="min-w-full border-collapse text-left text-[12px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    {csvRows[0].map((cell, cellIndex) => (
                      <th
                        key={`head-${cellIndex}`}
                        className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-pmedium text-slate-600"
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(1).map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`} className="odd:bg-white even:bg-slate-50/60">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`cell-${rowIndex}-${cellIndex}`}
                          className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2 text-slate-700"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        ) : null}

        {kind === "other" ? (
          <div className="p-6">
            <p className="text-[12px] font-pmedium text-slate-500">This file type cannot be previewed inline.</p>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-pmedium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Download size={13} /> Open file
            </a>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

type StoredAttachmentListProps = {
  attachments: PreviewAttachment[];
  emptyText?: string;
  thumbnailClassName?: string;
};

export function StoredAttachmentList({
  attachments,
  emptyText = "No attachment",
  thumbnailClassName = "h-20 w-20",
}: StoredAttachmentListProps) {
  const [preview, setPreview] = useState<PreviewAttachment | null>(null);

  if (!attachments.length) {
    return <p className="text-[12px] font-pmedium text-slate-400">{emptyText}</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-start gap-2.5">
        {attachments.map((attachment, index) => {
          const kind = getAttachmentKind(attachment);
          const key = attachment.id || `${attachment.url}-${index}`;

          if (kind === "image") {
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreview(attachment)}
                className={`group relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${thumbnailClassName}`}
                title={attachment.name || "Click to preview"}
              >
                <img
                  src={attachment.url}
                  alt={attachment.name || `Attachment ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Maximize2 size={18} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </button>
            );
          }

          if (kind === "pdf" || kind === "csv") {
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreview(attachment)}
                className="group relative flex h-20 w-40 shrink-0 flex-col items-start justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                title={attachment.name || "Click to preview"}
              >
                <span className={`flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-wider ${kind === "csv" ? "text-emerald-600" : "text-rose-600"}`}>
                  {kind === "csv" ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                  {kind}
                </span>
                <span className="w-full truncate text-[11px] font-pmedium text-slate-700">{attachment.name || "Attachment"}</span>
                <Maximize2 size={14} className="absolute right-2 top-2 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            );
          }

          return (
            <a
              key={key}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-pmedium text-slate-700 transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
            >
              <Paperclip size={12} className="shrink-0" />
              <span className="truncate">{attachment.name || "Attachment"}</span>
            </a>
          );
        })}
      </div>
      {preview ? <AttachmentViewer attachment={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}

type LocalAttachmentListProps = {
  files: File[];
  onRemove?: (index: number) => void;
  thumbnailClassName?: string;
};

export function LocalAttachmentList({
  files,
  onRemove,
  thumbnailClassName = "h-20 w-20",
}: LocalAttachmentListProps) {
  const [preview, setPreview] = useState<PreviewAttachment | null>(null);

  const filePreviews = useMemo(
    () =>
      files.map((file) => {
        const attachment: PreviewAttachment = {
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
          file,
        };
        return { file, attachment, kind: getAttachmentKind(attachment) };
      }),
    [files],
  );

  useEffect(
    () => () => {
      filePreviews.forEach(({ attachment }) => URL.revokeObjectURL(attachment.url));
    },
    [filePreviews],
  );

  if (!files.length) return null;

  return (
    <>
      <div className="flex flex-wrap items-start gap-2.5 pt-1">
        {filePreviews.map(({ file, attachment, kind }, index) => (
          <div key={`${file.name}-${index}`} className="relative">
            {kind === "image" ? (
              <button
                type="button"
                onClick={() => setPreview(attachment)}
                className={`group relative block overflow-hidden rounded-xl border border-slate-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${thumbnailClassName}`}
                title={file.name || "Click to preview"}
              >
                <img
                  src={attachment.url}
                  alt={file.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Maximize2 size={18} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </button>
            ) : kind === "pdf" || kind === "csv" ? (
              <button
                type="button"
                onClick={() => setPreview(attachment)}
                className="group relative flex h-20 w-40 flex-col items-start justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                title={file.name || "Click to preview"}
              >
                <span className={`flex items-center gap-1.5 text-[10px] font-pmedium uppercase tracking-wider ${kind === "csv" ? "text-emerald-600" : "text-rose-600"}`}>
                  {kind === "csv" ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                  {kind}
                </span>
                <span className="w-full truncate text-[11px] font-pmedium text-slate-700">{file.name}</span>
                <Maximize2 size={14} className="absolute right-2 top-2 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ) : (
              <div className="flex max-w-[220px] items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 py-1 pl-2.5 pr-6 text-[11px] font-pmedium text-blue-700">
                <Paperclip size={12} className="shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
            )}
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
                aria-label={`Remove ${file.name}`}
              >
                <X size={11} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {preview ? <AttachmentViewer attachment={preview} onClose={() => setPreview(null)} /> : null}
    </>
  );
}
