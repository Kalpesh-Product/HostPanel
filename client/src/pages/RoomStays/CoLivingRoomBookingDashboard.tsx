import coLivingBannerImage from "../../assets/co-living-banner.jpg";
import { RoomStayBookingDashboard } from "./HostelBookingDashboard";

export default function CoLivingRoomBookingDashboard() {
  return (
    <RoomStayBookingDashboard
      roomType="Room"
      title="Co-living Room Booking"
      bannerImage={coLivingBannerImage}
      routeBase="/common-modules/room-booking"
      resourcePlural="rooms"
      inventoryPlural="rooms"
      occupantPlural="co-living residents"
      description="Live room availability, reservations, resident movement, collections, and stay history."
      tags={["Rooms", "Residents", "Stays", "Bookings"]}
    />
  );
}
