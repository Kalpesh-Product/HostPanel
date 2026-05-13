import type { ReactNode } from "react";
import { useRef } from "react";
import { Modal, IconButton } from "@mui/material";
import { IoMdClose } from "react-icons/io";
import { AnimatePresence, motion } from "motion/react";

interface MuiModalProps {
  open: boolean;
  onClose: () => void;
  setOpen?: (open: boolean) => void;
  title?: ReactNode;
  children: ReactNode;
  headerBackground?: string;
}

const MuiModal = ({ open, onClose, title, children }: MuiModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  return (
    <AnimatePresence>
      <Modal open={open} onClose={onClose}>
        <div ref={modalRef} className="fixed inset-0 flex items-center justify-center">
          <motion.div
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            exit={{ y: -30 }}
            className="max-h-[90vh] w-4/5 overflow-y-auto rounded-lg bg-white shadow-xl outline-none md:w-2/5"
          >
            <div className="flex items-center justify-between rounded-t-md border-b border-borderGray px-4 py-2">
              <div className="text-subtitle w-full text-center uppercase text-primary">
                {title}
              </div>
              <IconButton sx={{ p: 0 }} onClick={onClose}>
                <IoMdClose className="text-subtitle text-black" style={{ color: "black" }} />
              </IconButton>
            </div>

            <div className="h-full p-4">{children}</div>
          </motion.div>
        </div>
      </Modal>
    </AnimatePresence>
  );
};

export default MuiModal;
