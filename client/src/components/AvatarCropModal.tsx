import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { ZoomIn } from "lucide-react";
import MuiModal from "./MuiModal";
import { getCroppedImageBlob } from "../utils/cropImage";

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => void;
  saving?: boolean;
}

export default function AvatarCropModal({ open, imageSrc, onClose, onSave, saving }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
    onSave(blob);
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  if (!imageSrc) return null;

  return (
    <MuiModal open={open} onClose={handleClose} title="Adjust Profile Photo">
      <div className="flex flex-col gap-4">
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomIn size={16} className="shrink-0 text-slate-400" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#2563EB]"
          />
        </div>

        <p className="text-center text-[12px] text-slate-500">
          Drag to reposition and use the slider to zoom. This is how your photo will appear everywhere.
        </p>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="rounded-xl bg-[#2563EB] px-6 py-2.5 text-[11px] font-pmedium uppercase tracking-wider text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Applying..." : "Use Photo"}
          </button>
        </div>
      </div>
    </MuiModal>
  );
}
