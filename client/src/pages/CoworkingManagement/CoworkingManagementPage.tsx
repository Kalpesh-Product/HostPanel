import { Store, Building2, Tag, ShoppingCart } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import Card from "../../components/Card";

export default function CoworkingManagementPage() {
  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Co-working Management</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Manage desks, pricing, tenant companies, and virtual offices.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card icon={<Tag />} title="Resource & Pricing" route="/key-apps/co-working-management/resource-pricing" />
          <Card icon={<Store />} title="Tenant Companies" route="/department-accesses/sales-department/tenant-companies" state={{ fromSection: "co-working-management" }} />
          <Card icon={<Building2 />} title="Virtual Offices" route="/department-accesses/sales-department/virtual-offices" state={{ fromSection: "co-working-management" }} />
          <Card icon={<ShoppingCart />} title="Sales Architecture" route="/department-accesses/sales-department/sales-architecture" state={{ fromSection: "co-working-management" }} />
        </div>
      </PageFrame>
    </div>
  );
}
