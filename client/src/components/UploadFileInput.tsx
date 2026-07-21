import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { TextField, IconButton, Avatar, Box } from "@mui/material";
import { LuImageUp } from "react-icons/lu";
import { MdDelete } from "react-icons/md";
import MuiModal from "./MuiModal";

type PreviewType = "image" | "pdf" | "none" | "auto";

const MAX_IMAGE_SIZE_MB = 1;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

interface UploadFileInputProps {
  value: File | null | unknown;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  allowedExtensions?: string[];
  previewType?: PreviewType;
  id?: string;
}

const UploadFileInput = ({
  value,
  onChange,
  disabled = false,
  label = "Upload File",
  allowedExtensions = ["jpg", "jpeg", "png", "pdf", "webp"],
  previewType = "auto",
  id,
}: UploadFileInputProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);

  useEffect(() => {
    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
    if (value && typeof value === "object" && typeof value.url === "string") {
      setPreviewUrl(value.url);
      return;
    }
    setPreviewUrl(null);
  }, [value]);

  const getExtension = (fileName: string) => fileName.split(".").pop()?.toLowerCase() ?? "";

  const isImage = (ext: string) => ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);

  const isPDF = (ext: string) => ext === "pdf";

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const ext = getExtension(file.name);
      if (!allowedExtensions.includes(ext)) {
        alert(`Only ${allowedExtensions.join(", ")} files are allowed.`);
        return;
      }

      if (isImage(ext) && file.size > MAX_IMAGE_SIZE_BYTES) {
        alert(`Image size must not exceed ${MAX_IMAGE_SIZE_MB}MB.`);
        return;
      }

      onChange(file);
      setPreviewUrl(URL.createObjectURL(file));

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = () => {
    onChange(null);
    setPreviewUrl(null);
  };

  const acceptAttr = allowedExtensions.map((ext) => `.${ext}`).join(",");

  const renderPreview = () => {
    if (!previewUrl) {
      return <div className="text-sm text-muted">Preview not available</div>;
    }

    const resolvedName =
      value instanceof File
        ? value.name
        : String((value && typeof value === "object" && value.name) || "");
    const ext = getExtension(resolvedName);
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
          src={previewUrl ?? undefined}
          alt="Preview"
          sx={{ width: "100%", height: "auto", borderRadius: 2 }}
          variant="square"
        />
      );
    }

    if (type === "pdf") {
      return (
        <iframe
          src={previewUrl ?? undefined}
          title="PDF Preview"
          style={{ width: "100%", height: "500px", borderRadius: "8px" }}
        />
      );
    }

    return <div className="text-sm text-muted">Preview not available</div>;
  };

  return (
    <Box className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttr}
        disabled={disabled}
        hidden
        id={id ?? "file-upload"}
        onChange={handleFileChange}
      />

      <TextField
        size="small"
        variant="outlined"
        fullWidth
        label={label}
        disabled={disabled}
        value={
          value instanceof File
            ? value.name
            : value && typeof value === "object" && typeof (value as any).url === "string"
              ? (value as any).url.split("/").pop() || "Image uploaded"
              : String((value && typeof value === "object" && (value as any).name) || "")
        }
        placeholder="Choose a file..."
        InputProps={{
          readOnly: true,
          endAdornment: (
            <div className="flex items-center">
              {previewUrl && (
                <IconButton size="small" color="error" onClick={handleClear} title="Remove image">
                  <MdDelete />
                </IconButton>
              )}
              <IconButton component="label" htmlFor={id ?? "file-upload"} color="primary">
                <LuImageUp />
              </IconButton>
            </div>
          ),
        }}
      />

      {previewUrl && (
        <>
          {/* Inline thumbnail so user can see current image without opening modal */}
          <div className="flex items-center gap-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-16 w-24 rounded object-cover border border-gray-200 cursor-pointer"
              onClick={() => setOpenModal(true)}
              title="Click to preview full size"
            />
            <span
              className="text-xs text-slate-500 cursor-pointer underline"
              onClick={() => setOpenModal(true)}
            >
              Preview full size
            </span>
          </div>

          <MuiModal open={openModal} onClose={() => setOpenModal(false)} title="File Preview">
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-gray-300 p-2">{renderPreview()}</div>
              <div className="flex justify-end">
                <IconButton color="error" onClick={handleClear}>
                  <MdDelete />
                </IconButton>
              </div>
            </div>
          </MuiModal>
        </>
      )}
    </Box>
  );
};

export default UploadFileInput;
