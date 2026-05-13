import type { ReactNode } from "react";

const PageFrame = ({ children }: { children: ReactNode }) => {
  return <div className="p-4 border-default border-borderGray rounded-xl">{children}</div>;
};

export default PageFrame;