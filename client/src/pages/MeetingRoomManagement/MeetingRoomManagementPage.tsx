import { Tag, CalendarCheck, LayoutGrid, ShoppingCart } from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import Card from "../../components/Card";

export default function MeetingRoomManagementPage() {
  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">Meeting Room Management</h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">Manage every bookable resource and its pricing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card icon={<CalendarCheck />} title="Meeting Room Booking" route="/meetings/meeting-rooms" state={{ fromSection: "meeting-room-management" }} />
          <Card icon={<LayoutGrid />} title="All Bookings" route="/department-accesses/administration-department/bookings" state={{ fromSection: "meeting-room-management" }} />
          <Card icon={<Tag />} title="Resource & Pricing" route="/department-accesses/sales-department/resource-pricing" state={{ fromSection: "meeting-room-management" }} />
          <Card icon={<ShoppingCart />} title="Sales Architecture" route="/department-accesses/sales-department/sales-architecture" state={{ fromSection: "meeting-room-management" }} />
        </div>
      </PageFrame>
    </div>
  );
}
