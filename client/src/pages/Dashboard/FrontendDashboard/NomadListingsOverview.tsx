import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useMutation, useQuery } from "@tanstack/react-query";
import AgTable from "../../../components/AgTable";
import PageFrame from "../../../components/Pages/PageFrame";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { toast } from "sonner";
import { queryClient } from "../../../main";
import StatusChip from "../../../components/StatusChip";
import ThreeDotMenu from "../../../components/ThreeDotMenu";

export default function NomadListingsOverview() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();
  const user = auth?.user;

  const companyId = user?.companyId || "";
  const companyName = user?.companyName || "";

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

  // ✅ Toggle status mutation
  const { mutate: toggleStatus } = useMutation({
    mutationFn: async (data) => {
      console.log("data", data);
      const response = await axios.patch(
        "/api/listings/activate-product",
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Status updated");
      queryClient.invalidateQueries({ queryKey: ["nomad-listings"] });
    },
    onError: (error) => {
      console.error("Toggle error", error);
      toast.error("Failed to update status");
    },
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
            params?.data?.isActive
              ? {
                  label: "Mark As Inactive",
                  onClick: () =>
                    toggleStatus({
                      businessId: params?.data?.businessId,
                      status: false,
                    }),
                }
              : {
                  label: "Mark As Active",
                  onClick: () =>
                    toggleStatus({
                      businessId: params?.data?.businessId,
                      status: true,
                    }),
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
