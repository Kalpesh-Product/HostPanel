import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useQuery } from "@tanstack/react-query";
import AgTable from "../../../components/AgTable";
import PageFrame from "../../../components/Pages/PageFrame";
import PrimaryButton from "../../../components/PrimaryButton";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";

export default function NomadListingsOverview() {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();
  const { companyId } = useParams();
   const {auth} = useAuth()
    const user = auth.user

  // ✅ Fetch listings of a company
  const { data: listings = [], isPending } = useQuery({
    queryKey: ["nomad-listings", companyId],
    queryFn: async () => {
      // const res = await axios.get(`/api/company/${companyId}/nomad-listings`);
       const res = await axios.get(`https://wononomadsbe.vercel.app/api/company/get-listings/${user.companyId}`);
        
      return res.data || [];
    },
  });

  // ✅ Table data
  const tableData = !isPending ? listings?.map((item, index) => ({
    srNo: index + 1,
    businessId: item.businessId,
    companyName: item.companyName,
    city: item.city,
    state: item.state,
    country: item.country,
    ratings: item.ratings,
    totalReviews: item.totalReviews,
  })) : [];

  // ✅ Table columns
  const columns = [
    { headerName: "SR NO", field: "srNo", width: 100 },
    { headerName: "Business ID", field: "businessId", flex: 1 },
    { headerName: "Company Name", field: "companyName", flex: 1 },
    { headerName: "City", field: "city", flex: 1 },
    { headerName: "State", field: "state", flex: 1 },
    { headerName: "Country", field: "country", flex: 1 },
    { headerName: "Ratings", field: "ratings", flex: 1 },
    { headerName: "Total Reviews", field: "totalReviews", flex: 1 },
  ];

  // ✅ Navigate to Add Listing form
  const handleAddClick = () => {
    navigate(`/dashboard/nomad-listings/add`);
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        {/* ✅ PrimaryButton above table */}
        {/* <div className="flex justify-end pb-4">
          <PrimaryButton
            type="button"
            title="Add Listing"
            handleSubmit={handleAddClick}
          />
        </div> */}

        <AgTable
          data={tableData}
          columns={columns}
          search
          tableTitle="Nomad Listings"
          loading={isPending}
          buttonTitle="Add Listing"
          handleClick={handleAddClick}
        />
      </PageFrame>
    </div>
  );
}
