import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs } from "@mui/material";

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
  const activeTab = tabs.findIndex((tab) =>
    location.pathname.includes(tab.path),
  );

  return (
    <div className="p-4">
      {showTabs && (
        <Tabs
          value={activeTab}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            backgroundColor: "white",
            borderRadius: 2,
            border: "1px solid #d1d5db",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: "medium",
              padding: "12px 16px",
              borderRight: "0.1px solid #d1d5db",
            },
            "& .Mui-selected": {
              backgroundColor: "#1E3D73",
              color: "white",
            },
          }}
        >
          {tabs.map((tab, index) => (
            <NavLink
              key={index}
              className={"border-r-[1px] border-borderGray"}
              to={tab.path}
              style={({ isActive }) => ({
                textDecoration: "none",
                color: isActive ? "white" : "#1E3D73",
                flex: 1,
                textAlign: "center",
                padding: "12px 16px",
                display: "block",
                backgroundColor: isActive ? "#1E3D73" : "white",
              })}
            >
              {tab.label}
            </NavLink>
          ))}
        </Tabs>
      )}

      <div className="py-4">
        <Outlet />
      </div>
    </div>
  );
};

export default ProfileLayout;
