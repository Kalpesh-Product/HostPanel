import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface FinanceCardItem {
  title: ReactNode;
  value: string | number;
  route?: string;
  stateData?: Record<string, unknown>;
}

interface FinanceCardProps {
  cardTitle: ReactNode;
  timePeriod?: ReactNode;
  descriptionData: FinanceCardItem[];
  highlightNegativePositive?: boolean;
  disableColorChange?: boolean;
  titleCenter?: boolean;
  stateData?: Record<string, unknown>;
}

const FinanceCard = ({
  cardTitle,
  timePeriod,
  descriptionData,
  highlightNegativePositive,
  disableColorChange,
  titleCenter,
}: FinanceCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl p-4 shadow-md">
      {titleCenter ? (
        <div className="flex items-center justify-between">
          <span className="text-title w-full text-center font-pmedium uppercase">
            {cardTitle}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-title text-center font-pmedium">{cardTitle}</span>
          <span className="text-content">{timePeriod}</span>
        </div>
      )}

      <hr className="h-[1px] w-full" />

      <div className="flex flex-col gap-2">
        {descriptionData.map((item, index) => {
          const numericValue =
            typeof item.value === "number"
              ? item.value
              : parseInt(String(item?.value).replace(/[^0-9-]/g, ""), 10);

          const dynamicColor =
            highlightNegativePositive && !Number.isNaN(numericValue)
              ? numericValue < 0
                ? "text-red-500"
                : "text-green-500"
              : "";

          return (
            <div key={`${String(item.title)}-${index}`}>
              <div className="flex items-center justify-between">
                <span
                  onClick={() => navigate(item.route || "", { state: item.stateData || {} })}
                  className={`text-content ${
                    item.route !== "#"
                      ? "cursor-pointer text-primary hover:underline"
                      : "text-black"
                  }`}
                >
                  {item.title}
                </span>
                <span
                  className={`text-content rounded-md p-2 ${
                    disableColorChange ? "" : dynamicColor
                  }`}
                >
                  {item.value}
                </span>
              </div>
              <hr className="border-b-default border-dotted" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FinanceCard;