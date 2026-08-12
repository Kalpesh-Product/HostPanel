import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { IconButton, Avatar, Box } from "@mui/material";
import { LuImageUp } from "react-icons/lu";
import { MdDelete } from "react-icons/md";
import MuiModal from "./MuiModal";
import UploadLimitWarning from "./UploadLimitWarning";

type PreviewType = "image" | "pdf" | "none" | "auto";
type MediaValue = File | { id?: string; url?: string; name?: string; enabled?: boolean };

const MAX_IMAGE_SIZE_MB = 1;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

interface UploadMultipleFilesInputProps {
  value?: MediaValue[];
  onChange?: (files: MediaValue[]) => void;
  disabled?: boolean;
  label?: string;
  allowedExtensions?: string[];
  previewType?: PreviewType;
  name?: string;
  id?: string;
  maxFiles?: number;
  // Opt-in: shows a per-item "Enabled/Disabled" switch on already-uploaded items
  // (not on newly-picked local files, which have no persistent identity yet).
  enabledToggle?: boolean;
}

interface PreviewItem {
  file: MediaValue;
  url: string;
  ext: string;
  revokeOnCleanup: boolean;
}

const UploadMultipleFilesInput = ({
  value = [],
  onChange,
  disabled = false,
  label = "Upload Files",
  allowedExtensions = ["jpg", "jpeg", "png", "pdf", "webp"],
  previewType = "auto",
  name,
  id,
  maxFiles = 5,
  enabledToggle = false,
}: UploadMultipleFilesInputProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const getExtension = (fileName = "") =>
    fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";

  const isImage = (ext: string) => ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);
  const isPDF = (ext: string) => ext === "pdf";

  const getItemName = (file: MediaValue) =>
    file instanceof File
      ? file.name
      : String(file?.name || file?.url || file?.id || "file");

  const previews = useMemo<PreviewItem[]>(
    () =>
      (value || [])
        .map((file) => {
          if (file instanceof File) {
            return {
              file,
              url: URL.createObjectURL(file),
              ext: getExtension(file.name),
              revokeOnCleanup: true,
            };
          }
          const url = String(file?.url || "").trim();
          if (!url) return null;
          return {
            file,
            url,
            ext: getExtension(getItemName(file)),
            revokeOnCleanup: false,
          };
        })
        .filter(Boolean) as PreviewItem[],
    [value]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        if (preview.revokeOnCleanup) URL.revokeObjectURL(preview.url);
      });
    };
  }, [previews]);

  const acceptAttr = allowedExtensions.map((ext) => `.${ext}`).join(",");

  const dedupe = (filesArr: MediaValue[]) => {
    const seen = new Set<string>();
    const out: MediaValue[] = [];
    for (const file of filesArr) {
      const key =
        file instanceof File
          ? `${file.name}-${file.size}-${file.lastModified}`
          : `${String(file?.id || "")}-${String(file?.url || "")}-${String(file?.name || "")}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(file);
      }
    }
    return out;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files || []);
    if (!chosen.length) return;

    const resetInput = () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const remainingSlots = Math.max(0, maxFiles - (value?.length || 0));

    // Bulk-select over the section's remaining capacity: reject the whole
    // batch and tell the user exactly how many to pick, rather than silently
    // keeping only the first few — that's confusing when picking many at once.
    if (remainingSlots <= 0) {
      setWarning(
        `This section already has the maximum of ${maxFiles} file${maxFiles === 1 ? "" : "s"}. Remove one before adding another.`,
      );
      resetInput();
      return;
    }

    if (chosen.length > remainingSlots) {
      setWarning(
        `You selected ${chosen.length} files, but only ${remainingSlots} more can be added here (limit ${maxFiles} total). Select ${remainingSlots} or fewer and try again.`,
      );
      resetInput();
      return;
    }

    const warnings: string[] = [];

    const allowedType = chosen.filter((file) => allowedExtensions.includes(getExtension(file.name)));
    const rejectedType = chosen.length - allowedType.length;
    if (rejectedType > 0) {
      warnings.push(
        `${rejectedType} file${rejectedType === 1 ? " was" : "s were"} skipped — only ${allowedExtensions.join(", ")} files are allowed.`,
      );
    }

    const filtered = allowedType.filter(
      (file) => !isImage(getExtension(file.name)) || file.size <= MAX_IMAGE_SIZE_BYTES
    );
    const rejectedSize = allowedType.length - filtered.length;
    if (rejectedSize > 0) {
      warnings.push(
        `${rejectedSize} image${rejectedSize === 1 ? " was" : "s were"} skipped — each image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`,
      );
    }

    const merged = dedupe([...(value || []), ...filtered]);
    const limited = merged.slice(0, maxFiles);

    setWarning(warnings.length ? warnings.join(" ") : null);
    onChange?.(limited);
    resetInput();
  };

  const handleRemoveAt = (index: number) => {
    const copy = [...(value || [])];
    copy.splice(index, 1);
    onChange?.(copy);
  };

  const handleToggleEnabledAt = (index: number) => {
    const copy = [...(value || [])];
    const item = copy[index];
    if (!item || item instanceof File) return;
    copy[index] = { ...item, enabled: item.enabled === false };
    onChange?.(copy);
  };

  const handleClear = () => {
    onChange?.([]);
  };

  const renderPreviewContent = (preview: PreviewItem) => {
    const ext = preview.ext;
    const type =
      previewType === "auto"
        ? isImage(ext)
          ? "image"
          : isPDF(ext)
            ? "pdf"
            : "none"
        : previewType;

    if (type === "image") {
      return (
        <Avatar
          src={preview.url}
          alt={getItemName(preview.file)}
          sx={{ width: "100%", height: "auto", borderRadius: 2 }}
          variant="square"
        />
      );
    }

    if (type === "pdf") {
      return (
        <iframe
          src={preview.url}
          title={getItemName(preview.file)}
          style={{ width: "100%", height: "65vh", borderRadius: "8px" }}
        />
      );
    }

    return (
      <div className="text-sm text-gray-500">
        Preview not available for "{getItemName(preview.file)}"
      </div>
    );
  };

  const displayValue =
    (value?.length || 0) === 0
      ? ""
      : value.length === 1
        ? getItemName(value[0])
        : `${value.length} files selected`;

  const reachedLimit = (value?.length || 0) >= maxFiles;

  return (
    <Box className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        id={id ?? "multiple-file-upload"}
        accept={acceptAttr}
        disabled={disabled}
        hidden
        multiple
        onChange={handleFileChange}
      />

      <div className="flex flex-col">
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
          {label} (max {maxFiles})
        </label>
        <div
          className={`mt-1 flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-pmedium ${
            disabled ? "border-slate-200/60 bg-slate-50 text-slate-400" : "border-slate-200/60 bg-white"
          }`}
        >
          <span className={`truncate ${displayValue ? "text-[#0F172A]" : "text-slate-400"}`}>
            {displayValue || `Choose up to ${maxFiles} files...`}
          </span>
          <label
            htmlFor={id ?? "multiple-file-upload"}
            title={reachedLimit ? `Limit ${maxFiles} files` : "Select files"}
            className={`shrink-0 rounded p-1 text-[#2563EB] hover:bg-[#2563EB]/10 ${
              disabled || reachedLimit ? "pointer-events-none opacity-40" : "cursor-pointer"
            }`}
          >
            <LuImageUp size={16} />
          </label>
        </div>
      </div>

      <UploadLimitWarning message={warning} onDismiss={() => setWarning(null)} />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={`${getItemName(preview.file)}-${index}`} className="flex flex-col gap-2 rounded-md border p-2">
              <div
                className="cursor-pointer"
                onClick={() => {
                  setModalIndex(index);
                  setOpenModal(true);
                }}
                title="Open preview"
              >
                {isImage(preview.ext) ? (
                  <img
                    src={preview.url}
                    alt={getItemName(preview.file)}
                    className="h-32 w-full rounded object-cover"
                  />
                ) : isPDF(preview.ext) ? (
                  <div className="flex h-32 w-full items-center justify-center rounded bg-gray-100 text-xs">
                    PDF Preview
                  </div>
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded bg-gray-100 text-xs">
                    No Preview
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                {enabledToggle && !(preview.file instanceof File) ? (
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500">
                    <span>{(preview.file as any)?.enabled !== false ? "Enabled" : "Disabled"}</span>
                    <span
                      role="switch"
                      aria-checked={(preview.file as any)?.enabled !== false}
                      onClick={() => handleToggleEnabledAt(index)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        (preview.file as any)?.enabled !== false ? "bg-accent" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          (preview.file as any)?.enabled !== false ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </label>
                ) : <span />}
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleRemoveAt(index)}
                  title="Remove"
                >
                  <MdDelete />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {value?.length > 0 && (
        <div className="flex justify-end">
          <button type="button" onClick={handleClear} className="text-sm text-red-600">
            Remove all
          </button>
        </div>
      )}

      <MuiModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={previews[modalIndex] ? getItemName(previews[modalIndex].file) : "File Preview"}
      >
        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-gray-300 p-2">
            {previews[modalIndex] && renderPreviewContent(previews[modalIndex])}
          </div>
          <div className="flex justify-end">
            <IconButton
              color="error"
              onClick={() => {
                handleRemoveAt(modalIndex);
                setOpenModal(false);
              }}
              title="Delete this file"
            >
              <MdDelete />
            </IconButton>
          </div>
        </div>
      </MuiModal>
    </Box>
  );
};

export default UploadMultipleFilesInput;
