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
  variant?: "default" | "workspace";
  subtitle?: ReactNode;
}

const MuiModal = ({ open, onClose, title, children, variant = "default", subtitle }: MuiModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const isWorkspace = variant === "workspace";

  return (
    <AnimatePresence>
      <Modal
        open={open}
        onClose={(event, reason) => {
          if (reason === "backdropClick") return;
          onClose();
        }}
      >
        <div
          ref={modalRef}
          className={isWorkspace
            ? "fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"
            : "fixed inset-0 flex items-center justify-center"}
        >
          <motion.div
            initial={isWorkspace ? { opacity: 0, y: 32, scale: 0.98 } : { y: 30 }}
            animate={isWorkspace ? { opacity: 1, y: 0, scale: 1 } : { y: 0 }}
            exit={isWorkspace ? { opacity: 0, y: 32, scale: 0.98 } : { y: -30 }}
            className={isWorkspace
              ? "bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[92vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col outline-none"
              : "max-h-[90vh] w-4/5 overflow-y-auto rounded-lg bg-white shadow-xl outline-none md:w-2/5"}
          >
            {isWorkspace ? (
              <>
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
                <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
                  <div className="min-w-0">
                    <div className="text-xl sm:text-2xl font-pmedium text-primary flex items-center gap-2">{title}</div>
                    {subtitle ? <p className="mt-2 text-[10px] sm:text-[11px] font-pmedium uppercase tracking-widest text-slate-500">{subtitle}</p> : null}
                  </div>
                  <button type="button" onClick={onClose} className="w-10 h-10 shrink-0 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm" aria-label="Close dialog">
                    <IoMdClose size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-t-md border-b border-borderGray px-4 py-2">
                <div className="text-subtitle w-full text-center uppercase text-primary">{title}</div>
                <IconButton sx={{ p: 0 }} onClick={onClose}>
                  <IoMdClose className="text-subtitle text-black" style={{ color: "black" }} />
                </IconButton>
              </div>
            )}

            <div className={isWorkspace
              ? "p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/30 font-pmedium [&_.MuiInputBase-root]:bg-white [&_.MuiInputBase-root]:rounded-xl [&_.MuiInputBase-root]:font-pmedium [&_.MuiInputLabel-root]:font-pmedium [&_.MuiFormHelperText-root]:font-pmedium [&_.MuiOutlinedInput-notchedOutline]:border-slate-200"
              : "h-full p-4"}
            >{children}</div>
          </motion.div>
        </div>
      </Modal>
    </AnimatePresence>
  );
};

export default MuiModal;
