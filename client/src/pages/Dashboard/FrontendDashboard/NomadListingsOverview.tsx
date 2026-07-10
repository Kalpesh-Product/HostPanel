// @ts-nocheck
import { useState } from "react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useMutation, useQuery } from "@tanstack/react-query";
import AgTable from "../../../components/AgTable";
import PageFrame from "../../../components/Pages/PageFrame";
import PrimaryButton from "../../../components/PrimaryButton";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import StatusChip from "../../../components/StatusChip";
import ThreeDotMenu from "../../../components/ThreeDotMenu";
import { toast } from "sonner";

export default function NomadListingsOverview() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const user = auth?.user;
  const [requestSent, setRequestSent] = useState(Boolean(user?.companiesListingRequested));

  // If staff have linked this Host Company to an existing Nomads company
  // (via Transfer), read/write listings there instead of a separate record.
  const companyId = user?.effectiveNomadsCompanyId || user?.companyId || "";
  const companyName = user?.companyName || "";
  const ownCompanyId = user?.companyId || "";
  const isLinkedToExistingCompany = Boolean(
    user?.effectiveNomadsCompanyId &&
      ownCompanyId &&
      user.effectiveNomadsCompanyId !== ownCompanyId,
  );

  const { mutate: requestCompaniesListing, isPending: isRequesting } = useMutation({
    mutationFn: async () => {
      const res = await axios.post("/api/listings/request-companies-listing");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Request sent");
      setRequestSent(true);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to send request");
    },
  });

  // ✅ Fetch listings of a company
  const { data: listings = [], isPending } = useQuery({
    queryKey: ["nomad-listings", companyId],
    enabled: !!companyId,
    // queryFn: async () => {
    //   const res = await axios.get(
    //     `https://wononomadsbe.vercel.app/api/company/get-listings/${companyId}`
    //   );
    //   return res.data || [];
    // },
    queryFn: async () => {
      const res = await axios.get(
        `https://wononomadsbe.vercel.app/api/company/get-listings/${companyId}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          params: {
            t: Date.now(), // cache buster
          },
        },
      );
      return res.data || [];
    },

    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // ✅ Table data
  const tableData = !isPending
    ? listings?.map((item, index) => ({
        ...item,
        srNo: index + 1,
        businessId: item.businessId,
        companyName: item.companyName,
        companyType: item.companyType,
        city: item.city,
        state: item.state,
        country: item.country,
        ratings: item.ratings,
        totalReviews: item.totalReviews,
      }))
    : [];

  // ✅ Table columns
  const columns = [
    { headerName: "SR NO", field: "srNo", width: 100 },
    { headerName: "Company Name", field: "companyName", flex: 1 },
    { headerName: "Company Type", field: "companyType", flex: 1 },
    {
      headerName: "Status",
      field: "isActive",
      flex: 1,
      cellRenderer: (params) => (
        <StatusChip status={params.value ? "Active" : "Inactive"} />
      ),
    },
    {
      headerName: "Actions",
      field: "actions",
      flex: 1,
      cellRenderer: (params) => (
        <ThreeDotMenu
          rowId={params.data.id}
          menuItems={[
            {
              label: "Edit",
              onClick: () => {
                sessionStorage.setItem("companyId", companyId);
                sessionStorage.setItem(
                  "companyName",
                  params?.data?.companyName || "",
                );
                sessionStorage.setItem(
                  "businessId",
                  params?.data?.businessId || "",
                );

                navigate(`/company-settings/nomad-listings/edit`, {
                  state: {
                    website: params.data,
                    companyId,
                    isLoading: isPending,
                  },
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  // ✅ Navigate to Add Listing form
  const handleAddClick = () => {
    navigate(`/company-settings/nomad-listings/add`, { state: { companyId } });
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {!isLinkedToExistingCompany && !!listings.length && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-blue-200 bg-blue-50">
          <div className="text-sm text-gray-700">
            {requestSent ? (
              <>Your request is pending review by our team.</>
            ) : (
              <>
                Want your listing to also appear on our public Companies
                directory? Request to have it reviewed and listed.
              </>
            )}
          </div>
          {!requestSent && (
            <PrimaryButton
              type="button"
              title={isRequesting ? "Sending..." : "Request to be listed"}
              disabled={isRequesting}
              handleSubmit={() => requestCompaniesListing()}
            />
          )}
        </div>
      )}
      <PageFrame>
        <AgTable
          data={tableData}
          columns={columns}
          search
          tableTitle="Nomad Listings"
          loading={isPending}
          buttonTitle="Add Product"
          handleClick={handleAddClick}
          hideFilter
        />
      </PageFrame>
    </div>
  );
}

