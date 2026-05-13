import MuiModal from "./MuiModal";
import DetalisFormatted from "./DetalisFormatted";

interface ViewDetailsField {
  key: string;
  label: string;
}

interface ViewDetailsModalProps {
  open: boolean;
  onClose: () => void;
  data?: Record<string, unknown> | null;
  fields: ViewDetailsField[];
  title?: string;
}

const ViewDetailsModal = ({ open, onClose, data, fields, title = "Details" }: ViewDetailsModalProps) => {
  return (
    <MuiModal open={open} onClose={onClose} title={title}>
      {data && (
        <div className="space-y-3 text-sm">
          {fields.map(({ key, label }) => (
            <DetalisFormatted key={key} title={label} detail={data[key] || "-"} />
          ))}
        </div>
      )}
    </MuiModal>
  );
};

export default ViewDetailsModal;