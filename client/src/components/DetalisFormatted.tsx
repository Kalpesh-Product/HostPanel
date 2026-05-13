import type { ReactNode } from "react";

interface DetalisFormattedProps {
  title?: ReactNode;
  detail?: ReactNode;
  gap?: string;
  upperCase?: boolean;
}

const DetalisFormatted = ({ title, detail, gap, upperCase = false }: DetalisFormattedProps) => {
  return (
    <div>
      <span className="text-content flex w-full items-start">
        <span className={gap ? gap : "w-[50%]"}>{title}</span>
        <span>:</span>

        <span
          className={`${upperCase ? "uppercase" : ""} text-content flex w-full flex-col items-start justify-start gap-2 pl-4`}
        >
          {detail || "—"}
        </span>
      </span>
    </div>
  );
};

export default DetalisFormatted;