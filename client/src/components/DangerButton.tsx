import type { MouseEventHandler, ReactNode } from "react";
import useReadOnlySession from "../hooks/useReadOnlySession";

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
  // Destructive-action component: never navigation, never a cancel, so it is
  // safe to disable wholesale in a read-only staff view.
  const { isReadOnly, readOnlyTooltip } = useReadOnlySession();

  return (
    <div>
      <button
        type={isReadOnly && type === "submit" ? "button" : type ?? "button"}
        disabled={isReadOnly}
        title={readOnlyTooltip}
        className={`rounded-md bg-red-200 px-8 py-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-50 ${
          fontSize ? fontSize : "text-content leading-5"
        } ${externalStyles ?? ""}`}
        onClick={isReadOnly ? undefined : handleSubmit}
      >
        {title}
      </button>
    </div>
  );
};

export default DangerButton;
