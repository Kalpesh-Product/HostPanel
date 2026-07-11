import type { ReactNode } from "react";
import { Children } from "react";
import PrimaryButton from "./PrimaryButton";

interface WidgetSectionProps {
  layout?: 1 | 2 | 3 | 4 | 5 | 6 | number;
  children?: ReactNode;
  title?: ReactNode;
  titleData?: ReactNode;
  height?: string;
  titleDataColor?: string;
  padding?: boolean;
  border?: boolean;
  button?: boolean;
  buttonTitle?: ReactNode;
  handleClick?: () => void;
  titleFont?: boolean;
  TitleAmount?: ReactNode;
  TitleAmountGreen?: ReactNode;
  TitleAmountRed?: ReactNode;
  greenTitle?: ReactNode;
  redTitle?: ReactNode;
  titleLabel?: ReactNode;
  fun?: unknown;
  normalCase?: boolean;
}

const WidgetSection = ({
  layout = 1,
  children,
  title,
  titleData,
  height,
  titleDataColor,
  padding,
  border,
  button = false,
  buttonTitle,
  handleClick,
  titleFont,
  TitleAmount,
  TitleAmountGreen,
  TitleAmountRed,
  greenTitle,
  redTitle,
  titleLabel,
  fun,
  normalCase,
}: WidgetSectionProps) => {
  const gridClasses: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: "grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 ",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-6",
  };

  return (
    <div className={`motion-preset-slide-up-sm py-0 ${height ? height : ""}`}>
      {title && (
        <div
          className={`border-default border-borderGray p-4 flex w-full justify-between items-center rounded-t-xl ${
            normalCase ? "" : "uppercase"
          }`}
        >
          <div className="flex w-full flex-col items-center justify-between gap-4 md:flex-col lg:flex-row">
            <div className="flex flex-col items-center justify-start gap-2 lg:flex-row lg:justify-start">
              <span
                className={`$${
                  titleFont
                    ? "text-mobileTitle lg:text-subtitle text-primary text-center w-full"
                    : "text-mobileTitle lg:text-widgetTitle text-primary font-pmedium text-center"
                }`}
              >
                {title}
              </span>

              {titleLabel ? (
                <span className="text-mobileTitle lg:text-widgetTitle text-primary font-pmedium">
                  {titleLabel}
                </span>
              ) : null}
            </div>

            {titleData && (
              <span>
                :{" "}
                <span style={{ color: titleDataColor }} className="font-pbold text-title">
                  {titleData}
                </span>
              </span>
            )}

            <div>
              <span className={`${titleFont ? "text-subtitle text-primary " : "text-widgetTitle text-primary font-pmedium"}`}>
                {TitleAmount}{" "}
              </span>
              <div className="flex gap-2">
                {TitleAmountGreen !== undefined && TitleAmountGreen !== null && (
                  <span className={`${titleFont ? "text-subtitle text-green-800" : "text-body text-green-800 font-pmedium"}`}>
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-[#54c4a657] p-2 uppercase">
                      {greenTitle && <div>{greenTitle} :</div>}
                      <div>{TitleAmountGreen}</div>
                    </div>
                  </span>
                )}
                {TitleAmountRed !== undefined && TitleAmountRed !== null && (
                  <span className={`${titleFont ? "text-subtitle text-red-800" : "text-body text-red-800 font-pmedium"}`}>
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-[#fc5e4640] p-2 uppercase">
                      {redTitle && <div>{redTitle} :</div>}
                      <div>{TitleAmountRed}</div>
                    </div>
                  </span>
                )}
              </div>
            </div>
          </div>
          {button && <PrimaryButton title={buttonTitle} handleSubmit={handleClick} />}
        </div>
      )}
      <div style={border ? { border: "2px solid #d1d5db", borderTop: "0" } : {}} className="h-full rounded-b-xl">
        <div
          style={{ padding: padding ? "0" : "1rem" }}
          className={`h-full w-full grid gap-4 py-4 ${gridClasses[(layout as 1 | 2 | 3 | 4 | 5 | 6)] ?? gridClasses[1]}`}
        >
          {Children.map(children, (child) => (
            <div>{child}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WidgetSection;
