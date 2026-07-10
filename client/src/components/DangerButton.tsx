import type { MouseEventHandler, ReactNode } from "react";

interface DangerButtonProps {
  title: ReactNode;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  fontSize?: string;
  externalStyles?: string;
}

const DangerButton = ({
  title,
  handleSubmit,
  type,
  fontSize,
  externalStyles,
}: DangerButtonProps) => {
  return (
    <div>
      <button
        type={type ?? "button"}
        className={`btn-pill bg-red-200 px-8 py-2 text-red-600 ${
          fontSize ?? ""
        } ${externalStyles ?? ""}`}
        onClick={handleSubmit}
      >
        {title}
      </button>
    </div>
  );
};

export default DangerButton;
