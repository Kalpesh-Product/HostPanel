import { Bed, House, Tag } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import Card from "../../components/Card";

export default function RoomManagementLandingPage({
  title,
  noun,
  description,
  managementRoute,
  resourcePricingRoute,
}: {
  title: string;
  noun: string;
  description: string;
  managementRoute: string;
  resourcePricingRoute: string;
}) {
  const ManagementIcon = noun === "Dorm" ? Bed : House;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">{title}</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card icon={<ManagementIcon />} title={title} route={managementRoute} />
          <Card icon={<Tag />} title="Resource & Pricing" route={resourcePricingRoute} />
        </div>
      </PageFrame>
    </div>
  );
}
