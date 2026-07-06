import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const ProfileLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { label: "Company Profile", path: "company-profile" },
    { label: "My Profile", path: "my-profile" },
    { label: "Change Password", path: "change-password" },
    { label: "Assigned Assets", path: "assigned-assets" },
    { label: "Payslips", path: "payslips" },
    { label: "Exit Request", path: "exit-request" },
  ];

  useEffect(() => {
    if (location.pathname === "/profile") {
      navigate("/profile/company-profile", {
        replace: true,
      });
    }
  }, [location, navigate]);

  const showTabs = !location.pathname.includes("budget/");
  const activeTabIndex = tabs.findIndex((tab) =>
    location.pathname.includes(tab.path),
  );

  return (
    <div className="p-4">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
          {tabs.map((tab, index) => {
            const isActive = activeTabIndex === index || location.pathname.includes(tab.path);
            return (
              <NavLink
                key={index}
                to={tab.path}
                className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-pbold font-bold uppercase tracking-widest transition-all text-center ${
                  isActive
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      )}

      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default ProfileLayout;
