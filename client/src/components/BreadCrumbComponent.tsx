import { Breadcrumbs, Typography, Link } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const BreadCrumbComponent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const queryParamEntries = Array.from(searchParams.entries());

  const rawSegments = location.pathname.startsWith("/dashboard")
    ? ["dashboard"]
    : location.pathname
        .split("/")
        .filter((segment) => segment && segment !== "app" && segment !== "dashboard");

  const pathSegments = (() => {
    if (
      rawSegments.length >= 2 &&
      rawSegments[0] === "visitors" &&
      rawSegments[1] === "visitor-management"
    ) {
      return ["key-apps", "visitor-management", ...rawSegments.slice(2)];
    }

    if (
      rawSegments.length >= 2 &&
      rawSegments[0] === "company-settings" &&
      ["wono-nomad", "nomad-listings", "reviews"].includes(rawSegments[1])
    ) {
      if (rawSegments[1] === "wono-nomad") return rawSegments;
      return ["company-settings", "wono-nomad", ...rawSegments.slice(1)];
    }

    return rawSegments;
  })();

  const displayLabel = (segment: string, index: number) => {
    const previousSegment = pathSegments[index - 1];

    if (segment === "key-apps") return "Key Apps";
    if (segment === "company-settings") return "Company Settings";
    if (segment === "wono-nomad") return "Wono Nomad";
    if (segment === "nomad-listings") return "Nomad Listings";
    if (segment === "add" && previousSegment === "nomad-listings") return "Add Listing";
    if (
      previousSegment === "nomad-listings" &&
      segment !== "add" &&
      segment !== "nomad-listings"
    ) {
      return "Edit Listing";
    }

    return decodeURIComponent(segment)
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const resolvePathForCrumb = (index: number) => {
    const upto = pathSegments.slice(0, index + 1);
    const isDashboardScoped = location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/");

    if (upto.length === 1 && upto[0] === "company-settings") {
      return "/company-settings";
    }

    if (upto.length === 1 && upto[0] === "key-apps") {
      return "/key-apps";
    }

    if (upto.length >= 2 && upto[0] === "key-apps" && upto[1] === "visitor-management") {
      return `/visitors/visitor-management${upto.length > 2 ? `/${upto.slice(2).join("/")}` : ""}`;
    }

    if (
      upto.length >= 3 &&
      upto[0] === "company-settings" &&
      upto[1] === "wono-nomad"
    ) {
      const realPathSegments = ["company-settings", ...upto.slice(2)];
      return `/${realPathSegments.join("/")}`;
    }

    const basePath = `/${upto.join("/")}`;
    return isDashboardScoped ? `/dashboard/${upto.join("/")}` : basePath;
  };

  const breadcrumbs = pathSegments.map((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    const fullPath = resolvePathForCrumb(index);
    const displayText = displayLabel(segment, index);

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
