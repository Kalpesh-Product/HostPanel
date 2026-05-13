import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { TextField, IconButton, Avatar, Box, Chip } from "@mui/material";
import { LuImageUp } from "react-icons/lu";
import { MdDelete } from "react-icons/md";
import MuiModal from "./MuiModal";

type PreviewType = "image" | "pdf" | "none" | "auto";

interface UploadMultipleFilesInputProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  disabled?: boolean;
  label?: string;
  allowedExtensions?: string[];
  previewType?: PreviewType;
  name?: string;
  id?: string;
  maxFiles?: number;
}

interface PreviewItem {
  file: File;
  url: string;
  ext: string;
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
}: UploadMultipleFilesInputProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const getExtension = (fileName = "") =>
    fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : "";

  const isImage = (ext: string) => ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);

  const isPDF = (ext: string) => ext === "pdf";

  const previews = useMemo<PreviewItem[]>(
    () =>
      (value || []).map((file) => ({
        file,
        url: URL.createObjectURL(file),
        ext: getExtension(file.name),
      })),
    [value]
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  const acceptAttr = allowedExtensions.map((ext) => `.${ext}`).join(",");

  const dedupe = (filesArr: File[]) => {
    const seen = new Set<string>();
    const out: File[] = [];
    for (const file of filesArr) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
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

    const filtered = chosen.filter((file) => allowedExtensions.includes(getExtension(file.name)));
    const rejected = chosen.length - filtered.length;
    if (rejected > 0) {
      alert(`Only ${allowedExtensions.join(", ")} files are allowed.`);
    }

    const merged = dedupe([...(value || []), ...filtered]);
    if (merged.length > maxFiles) {
      alert(`You can upload up to ${maxFiles} files.`);
    }
    const limited = merged.slice(0, maxFiles);

    onChange?.(limited);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAt = (index: number) => {
    const copy = [...(value || [])];
    copy.splice(index, 1);
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
          alt={preview.file.name}
          sx={{ width: "100%", height: "auto", borderRadius: 2 }}
          variant="square"
        />
      );
    }

    if (type === "pdf") {
      return (
        <iframe
          src={preview.url}
          title={preview.file.name}
          style={{ width: "100%", height: "65vh", borderRadius: "8px" }}
        />
      );
    }

    return <div className="text-sm text-gray-500">Preview not available for “{preview.file.name}”</div>;
  };

  const displayValue =
    (value?.length || 0) === 0
      ? ""
      : value.length === 1
        ? value[0].name
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

      <TextField
        size="small"
        variant="outlined"
        fullWidth
        label={`${label} (max ${maxFiles})`}
        disabled={disabled}
        value={displayValue}
        placeholder={`Choose up to ${maxFiles} files...`}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <IconButton
              component="label"
              htmlFor={id ?? "multiple-file-upload"}
              color="primary"
              disabled={disabled || reachedLimit}
              title={reachedLimit ? `Limit ${maxFiles} files` : "Select files"}
            >
              <LuImageUp />
            </IconButton>
          ),
        }}
      />

      {value?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((file, index) => (
            <Chip
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              label={file.name}
              onDelete={() => handleRemoveAt(index)}
              deleteIcon={<MdDelete />}
              variant="outlined"
              size="small"
            />
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={`${preview.file.name}-${index}`} className="flex flex-col gap-2 rounded-md border p-2">
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
                    alt={preview.file.name}
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

              <div className="flex items-center justify-between">
                <span className="truncate text-xs" title={preview.file.name}>
                  {preview.file.name}
                </span>
                <IconButton color="error" size="small" onClick={() => handleRemoveAt(index)} title="Remove">
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
        title={previews[modalIndex]?.file?.name || "File Preview"}
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