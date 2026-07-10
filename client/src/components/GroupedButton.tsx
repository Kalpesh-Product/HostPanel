import type { MouseEventHandler, ReactNode } from "react";

interface GroupedButtonProps {
  title: ReactNode;
  handleSubmit?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  fontSize?: string;
  externalStyles?: string;
}

const GroupedButton = ({
  title,
  handleSubmit,
  type,
  fontSize,
  externalStyles,
}: GroupedButtonProps) => {
  return (
    <div>
      <button
        type={type ?? "button"}
        className={`btn-pill bg-primary px-8 py-2 text-white ${
          fontSize ?? ""
        } ${externalStyles ?? ""}`}
        onClick={handleSubmit}
      >
        {title}
      </button>
    </div>
  );
};

export default GroupedButton;
