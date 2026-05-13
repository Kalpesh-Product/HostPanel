import { Tabs } from "@mui/material";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const TasksDepartmentLayout = () => {
  const location = useLocation();

  const tabs = [
    { label: "Employee On-Boarding", path: ":/month" },
    { label: "View Employees", path: "view-employees" },
    { label: "Attendance", path: "attendance" },
    { label: "Leaves", path: "leaves" },
  ];

  const showTabs = !location.pathname.includes("department-tasks");
  const activeTab = tabs.findIndex((tab) =>
    location.pathname.includes(tab.path),
  );

  return (
    <div className="p-0">
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

      <div className="py-0 bg-white">
        <Outlet />
      </div>
    </div>
  );
};

export default TasksDepartmentLayout;