// src/pages/Dashboard/FrontendDashboard/Companies.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import AgTable from "../../../components/AgTable";
import PageFrame from "../../../components/Pages/PageFrame";
import { Chip } from "@mui/material";
import { useDispatch } from "react-redux";
import { setSelectedCompany } from "../../../redux/slices/companySlice";

// ✅ helper to make slugs URL-safe
const slugify = (str) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const Companies = () => {
  const navigate = useNavigate();
  const axiosPrivate = useAxiosPrivate();
  const dispatch = useDispatch();

  // ✅ fetch companies from API
  const {
    data: companies = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["companiesList"],
    queryFn: async () => {
      try {
        const response = await axiosPrivate.get(
          "/api/hosts/get-company-listings"
        );
        return response.data; // backend should return an array of companies
      } catch (error) {
        throw new Error(
          error.response?.data?.message || "Failed to fetch companies"
        );
      }
    },
  });

  // ✅ define columns with logo, name, type, location
  const columns = useMemo(
    () => [
      {
        field: "logo",
        headerName: "Logo",
        width: 80,
        cellRenderer: (params) =>
          params.value ? (
            <img
              src={params.value}
              alt="logo"
              className="h-10 w-10 object-contain rounded"
            />
          ) : (
            "-"
          ),
      },
      {
        field: "companyName",
        headerName: "Company Name",
        flex: 1,
        cellRenderer: (params) => {
          console.log("params data : ", params.data);
          return (
            <span
              onClick={() => {
                dispatch(setSelectedCompany(params.data));
                navigate(
                  `/dashboard/companies/${slugify(params.data.companyName)}`
                );
              }}
              className="text-blue-600 hover:underline cursor-pointer">
              {params.value}
            </span>
          );
        },
      },
      { field: "companyType", headerName: "Type", flex: 1 },
      {
        field: "location",
        headerName: "Location",
        flex: 1,
        valueGetter: (params) =>
          `${params.data.city || ""}, ${params.data.country || ""}`,
      },
      {
        field: "registration",
        headerName: "Registration",
        flex: 1,
        valueGetter: (params) => {
          const link = params.data?.websiteTemplateLink;
          return link && String(link).trim() !== "" ? "Active" : "Inactive";
        },
        cellRenderer: (params) => {
          const value = params.value; // "Active" | "Inactive"

          const statusColorMap = {
            Active: { backgroundColor: "#90EE90", color: "#006400" },
            Inactive: { backgroundColor: "#FFC5C5", color: "#8B0000" },
          };

          const { backgroundColor, color } = statusColorMap[value] || {
            backgroundColor: "gray",
            color: "white",
          };

          return (
            <Chip
              label={value}
              style={{ backgroundColor, color }}
              size="small"
            />
          );
        },
      },
    ],
    [navigate]
  );

  if (isLoading) return <div className="p-6">Loading companies…</div>;
  if (isError)
    return <div className="p-6 text-red-500">Failed to load companies.</div>;

  return (
    <div className="p-4">
      <PageFrame>
        <AgTable
          data={companies}
          columns={columns}
          search={true}
          tableTitle={"Companies"}
          tableHeight={500}
        />
      </PageFrame>
    </div>
  );
};

export default Companies;
