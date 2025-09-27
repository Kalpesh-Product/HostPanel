import React from "react";
import YearWiseTable from "../../../components/Tables/YearWiseTable";
import PageFrame from "../../../components/Pages/PageFrame";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import useAuth from "../../../hooks/useAuth";

const CompanyLeads = () => {
  const selectedCompany = useSelector((state) => state.company.selectedCompany);
  const axios = useAxiosPrivate();
  const { auth } = useAuth();
  console.log("selected : sadas", selectedCompany);

  // const {
  //   data = [],
  //   isPending,
  //   isError,
  // } = useQuery({
  //   queryKey: ["leadCompany"],
  //   enabled: !!selectedCompany,
  //   queryFn: async () => {
  //     const response = await axios.get(
  //       // `https://wononomadsbe.vercel.app/api/company/leads?companyId=${selectedCompany?._id}`,
  //       `https://wononomadsbe.vercel.app/api/company/leads?companyId=${selectedCompany?.companyId}`,
  //       { headers: { "Cache-Control": "no-cache" } }
  //     );
  //     return response?.data;
  //   },
  // });

  const {
    data = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ["leadCompany"],
    enabled: !!selectedCompany,
    queryFn: async () => {
      const response = await axios.get(
        `https://wononomadsbe.vercel.app/api/company/leads?companyId=${auth?.user?.companyId}`,
        { headers: { "Cache-Control": "no-cache" } }
      );

      // Ensure it’s always an array
      return Array.isArray(response?.data) ? response.data : [];
    },
  });

  const columns = [
    {
      field: "srNo",
      headerName: "SrNo",
      width: 100,
    },
    {
      field: "fullName",
      headerName: "Lead Name",
    },
    {
      field: "source",
      headerName: "Source",
      cellRenderer: (params) => <span>{params.value || "-"}</span>,
    },
    {
      field: "productType",
      headerName: "Product",
      cellRenderer: (params) => <span>{params.value || "-"}</span>,
    },
    {
      field: "noOfPeople",
      headerName: "People Count",
    },
    {
      field: "mobileNumber",
      headerName: "Mobile Number",
    },
    {
      field: "email",
      headerName: "Email",
    },
    {
      field: "startDate",
      headerName: "Start Date",
    },
    {
      field: "endDate",
      headerName: "End Date",
    },
    {
      field: "recievedDate",
      headerName: "Recieved Date",
    },
    {
      field: "status",
      headerName: "Status",
    },
    {
      field: "comment",
      headerName: "Comment",
    },
  ];
  if (isPending) return <>Loading Leads</>;
  if (isError) return <span className="text-red-500">Error Loading Leads</span>;
  return (
    <div className="p-4">
      <PageFrame>
        <YearWiseTable
          data={data}
          tableTitle={"Leads"}
          columns={columns}
          // dateColumn="createdAt" // 👈 add this
        />
      </PageFrame>
    </div>
  );
};

export default CompanyLeads;
