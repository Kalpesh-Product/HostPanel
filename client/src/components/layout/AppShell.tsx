import React from "react";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return <div className="min-h-screen bg-[#F7F8FA] w-full">{children}</div>;
};
