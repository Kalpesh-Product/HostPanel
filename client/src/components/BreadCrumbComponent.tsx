import { Breadcrumbs, Typography, Link } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const BreadCrumbComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const queryParamEntries = Array.from(searchParams.entries());

  const pathSegments =
    location.pathname === "/dashboard"
      ? ["dashboard"]
      : location.pathname
          .split("/")
          .filter((segment) => segment && segment !== "app" && segment !== "dashboard");

  const breadcrumbs = pathSegments.map((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    const path = pathSegments.slice(0, index + 1).join("/");
    const isDirectAppPath = location.pathname.startsWith(`/${path}`) && !location.pathname.includes("/dashboard");
    const fullPath = isDirectAppPath ? `/${path}` : `/dashboard/${path}`;

    const displayText = decodeURIComponent(segment)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return isLast ? (
      <Typography key={index} color="text.primary">
        {displayText}
      </Typography>
    ) : (
      <Link
        key={index}
        underline="hover"
        color="inherit"
        onClick={() => navigate(fullPath)}
        style={{ cursor: "pointer" }}
      >
        {displayText}
      </Link>
    );
  });

  queryParamEntries.forEach(([key, value], index) => {
    breadcrumbs.push(
      <Typography key={`param-${index}-${key}`} color="text.primary">
        {`${value}`}
      </Typography>
    );
  });

  return (
    <div className="rounded-t-md">
      <Breadcrumbs
        separator="›"
        aria-label="breadcrumb"
        sx={{
          "& .MuiBreadcrumbs-ol": {
            fontSize: "1rem !important",
            color: "#1E3D73",
          },
          "& .MuiBreadcrumbs-li": {
            fontSize: "0.9rem !important",
          },
          "& .MuiBreadcrumbs-li .MuiTypography-root": {
            fontSize: "0.9rem !important",
            color: "#1E3D73 !important",
          },
          "& .MuiBreadcrumbs-separator": {
            margin: "0 1rem",
          },
        }}
      >
        {breadcrumbs}
      </Breadcrumbs>
    </div>
  );
};

export default BreadCrumbComponent;