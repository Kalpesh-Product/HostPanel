// src/pages/Dashboard/FrontendDashboard/PocDetails.jsx
import React from "react";
import PageFrame from "../../../components/Pages/PageFrame";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Avatar, TextField } from "@mui/material";
import useAuth from "../../../hooks/useAuth";

// ---------- UI helpers ----------
const ReadOnlyField = ({ label, value }) => (
  <TextField
    label={label}
    value={value ?? "—"}
    variant="standard"
    fullWidth
    disabled
    InputProps={{ readOnly: true }}
    sx={{
      "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "#111827" },
      "& .MuiInputLabel-root.Mui-disabled": { color: "#6b7280" },
    }}
  />
);

const placeholder = {
  name: "—",
  designation: "—",
  email: "—",
  linkedInProfile: "—",
  languagesSpoken: [],
  address: "—",
  isActive: null,
  avatarUrl: "",
};

// ---------- data helpers ----------
const getCompanyId = (c) => c?._id?.$oid || c?._id || c?.id || null;

async function fetchPocAxios(companyId, signal) {
  // Try both shapes; keep only the one that exists in prod if you know it
  const ENDPOINTS = [
    "https://wononomadsbe.vercel.app/api/poc",
    "https://wononomadsbe.vercel.app/api/poc/poc",
  ];

  for (const url of ENDPOINTS) {
    try {
      const res = await axios.post(
        url,
        { companyId },
        {
          signal,
          headers: { "Content-Type": "application/json" },
          timeout: 8000,
        }
      );
      const data = res.data;
      return Array.isArray(data) && data.length ? data[0] : data || null;
    } catch (_err) {
      // try next url
    }
  }
  return null;
}

// ---------- component ----------
const PocDetails = () => {
  const {auth} = useAuth()
  const user = auth.user
  console.log("auth",auth)
  const selectedCompany = useSelector((s) => s.company?.selectedCompany);
  const companyId = getCompanyId(selectedCompany);
  const pocFromCompany = selectedCompany?.poc || null; // instant fill if present

  const { data: fetchedPoc = null } = useQuery({
    queryKey: ["pocDetails", companyId],
    enabled: !!companyId && !pocFromCompany, // skip query if we already have POC in Redux
    queryFn: ({ signal }) => fetchPocAxios(companyId, signal),
    placeholderData: null, // no loaders; we'll normalize below
    refetchOnWindowFocus: false,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  });

  const poc = pocFromCompany || fetchedPoc || placeholder;

  // Normalize for display
  const languagesArr =
    (Array.isArray(poc?.languagesSpoken) && poc.languagesSpoken.length
      ? poc.languagesSpoken
      : Array.isArray(poc?.languages) && poc.languages?.length
      ? poc.languages
      : []) || [];

  const view = {
    fullName: poc?.name ?? "—",
    designation: poc?.designation ?? "—",
    email: poc?.email ?? "—",
    linkedInProfile: poc?.linkedInProfile ?? "—",
    address: poc?.address ?? "—",
    isActive:
      typeof poc?.isActive === "boolean"
        ? poc.isActive
          ? "Active"
          : "Inactive"
        : "—",
    languages: languagesArr.length ? languagesArr.join(", ") : "—",
    avatarUrl: poc?.avatarUrl ?? "",
  };

  return (
    <div className="p-4">
      <PageFrame>
        <div className="flex items-center justify-between pb-4">
          <span className="text-title font-pmedium text-primary uppercase">
            POC Details
          </span>
          {selectedCompany?.companyName && (
            <span className="text-sm text-gray-500">
              Company:{" "}
              <span className="font-pmedium text-gray-700">
                {selectedCompany.companyName}
              </span>
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center gap-6 border border-gray-200 rounded-xl p-4">
            <Avatar
              src={view.avatarUrl}
              sx={{ width: 96, height: 96, fontSize: "2rem" }}>
              {String(view.fullName || "P").charAt(0)}
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-semibold text-gray-900">
                  {view.fullName}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {view.designation}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {/* Company ID: {companyId || "—"} */}
              </div>
            </div>
          </div>

          {/* Two-column, read-only fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mt-6">
            <ReadOnlyField label="Full Name" value={view.fullName} />
            <ReadOnlyField label="Designation" value={view.designation} />
            <ReadOnlyField label="Email" value={view.email} />
            <ReadOnlyField
              label="LinkedIn Profile"
              value={view.linkedInProfile}
            />
            <ReadOnlyField label="Languages" value={view.languages} />
            <ReadOnlyField label="Address" value={view.address} />
            <ReadOnlyField label="Active" value={view.isActive} />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default PocDetails;
