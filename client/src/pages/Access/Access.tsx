import hierarchy from "../../assets/hierarchy-new.png";
import PageFrame from "../../components/Pages/PageFrame";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import MuiAccordion from "../../components/MuiAccordion";

const Access = () => {
  const axios = useAxiosPrivate();
  const navigate = useNavigate();

  const { data: departments } = useQuery({
    queryKey: ["access-departments"],
    queryFn: async () => {
      const response = await axios.get("/api/access/department-wise-employees");
      return response.data?.data;
    },
  });

  const handleEmployeeClick = (emp: any) => {
    const userData = {
      _id: emp?._id,
      name: `${emp?.firstName || ""} ${emp?.lastName || ""}`,
      designation: emp?.role?.map((item: any) => item.roleTitle),
      email: emp.email || "",
      workLocation: emp.workLocation || "",
      profilePicture: emp.profilePicture?.url || "",
      status: emp.isActive ? "Active" : "Inactive",
    };

    navigate("permissions", {
      state: {
        user: userData,
      },
    });
  };

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px] flex flex-col gap-4">
      <PageFrame>
        <div className="h-[35rem] overflow-hidden">
          <img src={hierarchy} alt="hierarchy" className="h-full w-full object-contain" />
        </div>
      </PageFrame>

      <PageFrame>
        <MuiAccordion
          data={departments}
          titleKey="name"
          itemsKey="employees"
          itemClick={handleEmployeeClick}
          disabledKey="isActive"
        />
      </PageFrame>
    </div>
  );
};

export default Access;