import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Bed,
  Calendar,
  CheckCircle2,
  IdCard,
  LogIn,
  LogOut,
  Minus,
  Phone,
  Plus,
  PlusCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import PageFrame from "../../components/Pages/PageFrame";
import { useAppConfirm } from "../../components/app/AppConfirmProvider";
import useWorkspacePreferences from "../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../lib/workspaceLocalization";
import { getCities, getCountries, getStates } from "../../utils/locationApi";
import RoomReservationsPanel from "./RoomReservationsPanel";
import {
  createRoomBooking,
  extendRoomBooking,
  getRoomAvailability,
  getRoomBookings,
  getRoomStayCheckTimes,
  updateRoomBookingStatus,
  type GuestRoomType,
  type RoomAvailability,
  type RoomStayBooking,
  type RoomStayBookingSource,
  type RoomStayStatus,
} from "../../services/roomStays";

type Tab = "availability" | "reservations" | "guests" | "history";
type CheckTimes = { checkInTime: string; checkOutTime: string };
type AdditionalGuestForm = { name: string; age: string; gender: string };

const ROOM_STAY_TABS: Tab[] = [
  "availability",
  "reservations",
  "guests",
  "history",
];

const ID_PROOF_TYPES = [
  "Aadhaar",
  "Passport",
  "Driving License",
  "Voter ID",
  "Other",
];
const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Bank Transfer"];
const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const BOOKING_SOURCES: RoomStayBookingSource[] = [
  "Walk-in",
  "Phone",
  "Website",
  "Partner",
];

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

const formatBedLabel = (booking: RoomStayBooking) => {
  const beds = booking.bedNumbers && booking.bedNumbers.length
    ? booking.bedNumbers
    : booking.bedNumber !== null && booking.bedNumber !== undefined
      ? [booking.bedNumber]
      : [];
  if (!beds.length) return "—";
  return `Bed${beds.length > 1 ? "s" : ""} ${beds.join(", ")}`;
};

const baseCardClass =
  "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";
const FIELD =
  "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all";
const LABEL =
  "mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-500";
const SEARCH_INPUT =
  "w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500";
const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50";
const TOOLBAR =
  "p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50";
const TH = "px-3.5 py-2";
const TD = "px-3.5 py-2 text-[12px] font-pmedium text-slate-900";

const STATUS_TONE: Record<
  RoomStayStatus,
  "sky" | "emerald" | "slate" | "rose"
> = {
  Booked: "sky",
  "Checked-in": "emerald",
  "Checked-out": "slate",
  Cancelled: "rose",
};
const TONE_CLASS: Record<string, string> = {
  sky: "border-sky-200 bg-sky-50 text-sky-700",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
};
const pill = (tone: string) =>
  `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest ${TONE_CLASS[tone]}`;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const todayInput = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="bg-slate-50/50 py-20 text-center text-slate-400"
      >
        <p className="text-sm font-pmedium">{message}</p>
      </td>
    </tr>
  );
}

function SummaryCards({
  cards,
}: {
  cards: Array<{
    key: string;
    icon: typeof Bed;
    label: string;
    value: string;
    cardClass: string;
    iconClass: string;
  }>;
}) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4 shrink-0">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className={card.cardClass}>
            <div className="min-w-0">
              <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">
                {card.label}
              </p>
              <p className="text-[15px] font-pmedium text-slate-900">
                {card.value}
              </p>
            </div>
            <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}>
              <Icon size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RoomStayBookingPage({
  roomType,
  title,
  noun,
}: {
  roomType: GuestRoomType;
  title: string;
  noun: string;
}) {
  const workspacePreferences = useWorkspacePreferences();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, {
      maximumFractionDigits: 2,
    });

  const [tab, setTab] = useState<Tab>(() =>
    ROOM_STAY_TABS.includes(requestedTab as Tab)
      ? (requestedTab as Tab)
      : "availability",
  );
  const [checkTimes, setCheckTimes] = useState<CheckTimes>({
    checkInTime: "09:00",
    checkOutTime: "22:00",
  });

  useEffect(() => {
    const nextTab = ROOM_STAY_TABS.includes(requestedTab as Tab)
      ? (requestedTab as Tab)
      : "availability";
    setTab(nextTab);
  }, [requestedTab]);

  useEffect(() => {
    getRoomStayCheckTimes()
      .then((res) => {
        if (res?.data?.data) setCheckTimes(res.data.data);
      })
      .catch(() => {
        // keep defaults
      });
  }, []);

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
              {title}
            </h2>
            <p className="text-xs font-pmedium text-slate-500 mt-1">
              Check availability, book a stay, and manage guests.
            </p>
          </div>
        </div>

        {tab === "availability" && (
          <AvailabilityTab
            roomType={roomType}
            noun={noun}
            formatCurrency={formatCurrency}
            checkTimes={checkTimes}
          />
        )}
        {tab === "reservations" && (
          <RoomReservationsPanel
            roomType={roomType}
            noun={noun}
            formatCurrency={formatCurrency}
          />
        )}
        {tab === "guests" && (
          <CurrentGuestsTab
            roomType={roomType}
            noun={noun}
            formatCurrency={formatCurrency}
          />
        )}
        {tab === "history" && (
          <HistoryTab
            roomType={roomType}
            noun={noun}
            formatCurrency={formatCurrency}
          />
        )}
      </PageFrame>
    </div>
  );
}

function AvailabilityTab({
  roomType,
  noun,
  formatCurrency,
  checkTimes,
}: {
  roomType: GuestRoomType;
  noun: string;
  formatCurrency: (value?: number) => string;
  checkTimes: CheckTimes;
}) {
  const checkIn = todayInput();
  const checkOut = todayInput(1);
  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<RoomAvailability | null>(null);
  const [inventorySearch, setInventorySearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const load = async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setIsLoading(true);
    try {
      const res = await getRoomAvailability(roomType, checkIn, checkOut);
      setRooms(
        Array.isArray(res?.data?.data?.rooms) ? res.data.data.rooms : [],
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load availability."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType]);

  const totalRooms = rooms.length;
  const totalInventory = rooms.reduce(
    (sum, room) => sum + (roomType === "Dorm" ? room.totalBeds : 1),
    0,
  );
  const availableInventory = rooms.reduce(
    (sum, room) => sum + (roomType === "Dorm" ? room.availableBeds : room.availableBeds > 0 ? 1 : 0),
    0,
  );
  const occupiedInventory = Math.max(0, totalInventory - availableInventory);
  const inventoryColumnCount = roomType === "Dorm" ? 8 : 7;
  const avgRate = totalRooms
    ? rooms.reduce((sum, room) => sum + Number(room.pricePerNight || 0), 0) /
      totalRooms
    : 0;
  const filteredRooms = rooms.filter((room) => {
    if (availableOnly && room.availableBeds <= 0) return false;
    const query = inventorySearch.trim().toLowerCase();
    if (!query) return true;
    return [room.name, room.floor, room.wing, ...(room.amenities || [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  return (
    <>
      <SummaryCards
        cards={[
          {
            key: "total",
            icon: Bed,
            label: roomType === "Dorm" ? "Total Beds" : "Total Rooms",
            value: String(totalInventory),
            cardClass: `${baseCardClass} border-l-4 border-l-blue-500`,
            iconClass: "bg-blue-50 text-blue-600",
          },
          {
            key: "available",
            icon: CheckCircle2,
            label: "Available Now",
            value: String(availableInventory),
            cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`,
            iconClass: "bg-emerald-50 text-emerald-600",
          },
          {
            key: "occupied",
            icon: Users,
            label: "Occupied / Held",
            value: String(occupiedInventory),
            cardClass: `${baseCardClass} border-l-4 border-l-amber-500`,
            iconClass: "bg-amber-50 text-amber-600",
          },
          {
            key: "rate",
            icon: TrendingUp,
            label: "Avg Nightly Rate",
            value: formatCurrency(avgRate),
            cardClass: `${baseCardClass} border-l-4 border-l-violet-500`,
            iconClass: "bg-violet-50 text-violet-600",
          },
        ]}
      />

      <div className="flex min-h-110 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-pmedium uppercase tracking-[0.08em] text-[#1E3D73]">
              {roomType === "Dorm" ? "Dorm inventory" : "Room inventory"}
            </p>
            <p className="mt-1 text-[10px] font-pmedium text-slate-500">
              Current availability is shown below. Select Book to choose dates, source, and payment details.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-[10px] font-pmedium text-slate-500">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(event) => setAvailableOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Available only
            </label>
            <div className="relative min-w-56">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={`${SEARCH_INPUT} py-2`}
                value={inventorySearch}
                onChange={(event) => setInventorySearch(event.target.value)}
                placeholder={`Search ${noun.toLowerCase()}s...`}
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr>
                <th className={TH}>{noun}</th>
                {roomType === "Dorm" && <th className={TH}>Beds</th>}
                <th className={TH}>Floor / Wing</th>
                <th className={TH}>Amenities</th>
                <th className={`${TH} text-right`}>Rate / Night</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={TH}>Frees Up</th>
                <th className={`${TH} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <EmptyRow colSpan={inventoryColumnCount} message="Loading availability..." />
              ) : rooms.length === 0 ? (
                <EmptyRow
                  colSpan={inventoryColumnCount}
                  message={`No ${noun.toLowerCase()}s set up yet. Add them in Resource & Pricing first.`}
                />
              ) : filteredRooms.length === 0 ? (
                <EmptyRow
                  colSpan={inventoryColumnCount}
                  message="No inventory matches the selected availability filters."
                />
              ) : (
                filteredRooms.map((room) => {
                  const free = room.availableBeds > 0;
                  return (
                    <tr
                      key={room._id}
                      className="transition-all hover:bg-blue-50/30"
                    >
                      <td className={TD}>
                        {room.name}
                        {room.chargesSecurityDeposit && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wide text-amber-700">
                            <ShieldCheck size={10} /> Deposit {formatCurrency(room.securityDepositAmount)}
                          </span>
                        )}
                      </td>
                      {roomType === "Dorm" && (
                        <td className={TD}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wide text-emerald-700">
                              {room.availableBeds} free
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-wide text-slate-600">
                              {Math.max(0, room.totalBeds - room.availableBeds)} used
                            </span>
                          </div>
                        </td>
                      )}
                      <td className={`${TD} text-slate-500`}>
                        {[room.floor, room.wing].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className={`${TD} text-slate-500`}>
                        {room.amenities && room.amenities.length > 0 ? (
                          <span className="block max-w-[220px] truncate text-[11px]">
                            {room.amenities.join(" · ")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        {formatCurrency(room.pricePerNight)}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <span className={pill(free ? "emerald" : "slate")}>
                          {free ? "Available" : "Booked"}
                        </span>
                      </td>
                      <td className={`${TD} text-slate-500`}>
                        {free ? "—" : formatDateTime(room.nextAvailableAt)}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelected(room)}
                          className={SECONDARY_BUTTON}
                        >
                          Book
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <BookingDialog
          room={selected}
          roomType={roomType}
          checkIn={checkIn}
          checkOut={checkOut}
          checkTimes={checkTimes}
          formatCurrency={formatCurrency}
          onClose={() => setSelected(null)}
          onBooked={async () => {
            setSelected(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function BookingDialog({
  room,
  roomType,
  checkIn,
  checkOut,
  checkTimes,
  formatCurrency,
  onClose,
  onBooked,
}: {
  room: RoomAvailability;
  roomType: GuestRoomType;
  checkIn: string;
  checkOut: string;
  checkTimes: CheckTimes;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onBooked: () => Promise<void>;
}) {
  const { billing } = useWorkspacePreferences();
  const taxConfig = billing.tax;
  const [bookingSource, setBookingSource] =
    useState<RoomStayBookingSource>("Walk-in");
  const [stayCheckIn, setStayCheckIn] = useState(checkIn);
  const [stayCheckOut, setStayCheckOut] = useState(checkOut);
  const [liveRoom, setLiveRoom] = useState(room);
  const [isCheckingDates, setIsCheckingDates] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [bedCount, setBedCount] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [guestGender, setGuestGender] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestState, setGuestState] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuestForm[]>([]);
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [idProofType, setIdProofType] = useState(ID_PROOF_TYPES[0]);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [paymentTransactionNumber, setPaymentTransactionNumber] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [applyTax, setApplyTax] = useState(true);
  const [collectDeposit, setCollectDeposit] = useState(false);
  const [depositCollected, setDepositCollected] = useState("");
  const [depositPaymentMethod, setDepositPaymentMethod] = useState(
    PAYMENT_METHODS[0],
  );
  const [depositProofFile, setDepositProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"details" | "review">("details");

  const isDorm = roomType === "Dorm";
  const maxBeds = isDorm ? Math.max(0, liveRoom.availableBeds) : liveRoom.availableBeds > 0 ? 1 : 0;
  const nights = Math.max(
    1,
    Math.round(
      (new Date(stayCheckOut).getTime() - new Date(stayCheckIn).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const subtotalBeforeDiscount = room.pricePerNight * nights * (isDorm ? bedCount : 1);
  const rawDiscountValue = Math.max(0, Number(discountValue) || 0);
  const rawDiscount =
    discountType === "percent"
      ? subtotalBeforeDiscount * (Math.min(rawDiscountValue, 100) / 100)
      : rawDiscountValue;
  const discountAmount = Math.round(Math.min(Math.max(rawDiscount, 0), subtotalBeforeDiscount) * 100) / 100;
  const taxableBaseAfterDiscount = Math.round(Math.max(subtotalBeforeDiscount - discountAmount, 0) * 100) / 100;
  const taxEnabled = taxConfig.enabled && applyTax;
  const taxRatePercent = taxEnabled ? Math.max(0, Number(taxConfig.ratePercent || 0)) : 0;
  const taxAmount =
    taxRatePercent <= 0
      ? 0
      : Math.round(
          (taxConfig.priceIncludesTax
            ? taxableBaseAfterDiscount * (taxRatePercent / (100 + taxRatePercent))
            : taxableBaseAfterDiscount * (taxRatePercent / 100)) * 100,
        ) / 100;
  const total = Math.round(
    (taxConfig.priceIncludesTax && taxEnabled ? taxableBaseAfterDiscount : taxableBaseAfterDiscount + taxAmount) * 100,
  ) / 100;
  const requiresDeposit = Boolean(room.chargesSecurityDeposit);
  const depositAmount = requiresDeposit ? Number(room.securityDepositAmount || 0) : 0;
  const depositToCollect =
    requiresDeposit && collectDeposit
      ? Math.min(depositAmount, Number(depositCollected || 0) || depositAmount)
      : 0;

  useEffect(() => {
    const requiredGuests = isDorm ? Math.max(0, bedCount - 1) : 0;
    setAdditionalGuests((current) =>
      Array.from(
        { length: requiredGuests },
        (_, index) => current[index] || { name: "", age: "", gender: "" },
      ),
    );
  }, [bedCount, isDorm]);

  useEffect(() => {
    void getCountries().then(setCountryOptions);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!guestCountry) {
      setStateOptions([]);
      setGuestState("");
      setCityOptions([]);
      setGuestCity("");
      return () => {
        cancelled = true;
      };
    }
    setIsLoadingStates(true);
    getStates(guestCountry)
      .then((result) => {
        if (cancelled) return;
        setStateOptions(result);
        setGuestState((current) => (result.includes(current) ? current : ""));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guestCountry]);

  useEffect(() => {
    let cancelled = false;
    if (!guestCountry || !guestState) {
      setCityOptions([]);
      setGuestCity("");
      return () => {
        cancelled = true;
      };
    }
    setIsLoadingCities(true);
    getCities(guestCountry, guestState)
      .then((result) => {
        if (cancelled) return;
        setCityOptions(result);
        setGuestCity((current) => (result.includes(current) ? current : ""));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [guestCountry, guestState]);

  useEffect(() => {
    let cancelled = false;
    if (!stayCheckIn || !stayCheckOut || stayCheckOut <= stayCheckIn) {
      setAvailabilityError("Choose a valid check-in and check-out range.");
      return () => {
        cancelled = true;
      };
    }

    setIsCheckingDates(true);
    setAvailabilityError("");
    getRoomAvailability(roomType, stayCheckIn, stayCheckOut)
      .then((response) => {
        if (cancelled) return;
        const inventory = Array.isArray(response?.data?.data?.rooms)
          ? response.data.data.rooms
          : [];
        const refreshedRoom = inventory.find(
          (entry: RoomAvailability) => entry._id === room._id,
        );
        if (!refreshedRoom) {
          setAvailabilityError("This inventory item is no longer available for booking.");
          return;
        }
        setLiveRoom(refreshedRoom);
        const nextMaximum =
          roomType === "Dorm"
            ? Math.max(0, refreshedRoom.availableBeds)
            : refreshedRoom.availableBeds > 0
              ? 1
              : 0;
        setBedCount((current) => Math.min(Math.max(1, current), Math.max(1, nextMaximum)));
        if (nextMaximum === 0) {
          setAvailabilityError(
            roomType === "Dorm"
              ? "No beds are available in this dorm for the selected dates."
              : "This room is booked for the selected dates.",
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAvailabilityError(
            getErrorMessage(error, "Unable to check the selected dates."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingDates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [room._id, roomType, stayCheckIn, stayCheckOut]);

  const validateDetails = () => {
    if (!guestName.trim()) {
      toast.error("Guest name is required.");
      return false;
    }
    if (!guestPhone.trim()) {
      toast.error("Guest phone number is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      toast.error("Enter a valid guest email address.");
      return false;
    }
    const primaryAge = Number(guestAge);
    if (!Number.isInteger(primaryAge) || primaryAge < 1 || primaryAge > 120) {
      toast.error("Enter a valid guest age.");
      return false;
    }
    if (!guestGender) {
      toast.error("Select the guest's gender.");
      return false;
    }
    if (!guestCountry.trim()) {
      toast.error("Guest country is required.");
      return false;
    }
    if (!guestState.trim()) {
      toast.error("Guest state is required.");
      return false;
    }
    if (!guestCity.trim()) {
      toast.error("Guest city is required.");
      return false;
    }
    if (!guestAddress.trim()) {
      toast.error("Guest address is required.");
      return false;
    }
    if (Boolean(emergencyContactName.trim()) !== Boolean(emergencyContactPhone.trim())) {
      toast.error("Enter both emergency contact name and phone, or leave both blank.");
      return false;
    }
    if (isCheckingDates) {
      toast.error("Wait for availability to finish checking.");
      return false;
    }
    if (availabilityError || maxBeds < 1) {
      toast.error(availabilityError || "This selection is unavailable for the chosen dates.");
      return false;
    }
    if (isDorm && (bedCount < 1 || bedCount > maxBeds)) {
      toast.error(`Choose between 1 and ${maxBeds} bed${maxBeds === 1 ? "" : "s"}.`);
      return false;
    }
    const invalidAdditionalGuest = additionalGuests.findIndex((guest) => {
      const age = Number(guest.age);
      return !guest.name.trim() || !Number.isInteger(age) || age < 1 || age > 120 || !guest.gender;
    });
    if (invalidAdditionalGuest >= 0) {
      toast.error(`Complete the name, age and gender for guest ${invalidAdditionalGuest + 2}.`);
      return false;
    }
    if (!idProofFile) {
      toast.error("Attach the guest's ID proof document.");
      return false;
    }
    if (paymentMethod !== "Cash" && !paymentTransactionNumber.trim()) {
      toast.error("Enter the transaction or reference number for this payment.");
      return false;
    }
    if (discountType === "percent" && rawDiscountValue > 100) {
      toast.error("Discount percentage cannot be greater than 100.");
      return false;
    }
    if (discountType === "amount" && rawDiscountValue > subtotalBeforeDiscount) {
      toast.error("Discount amount cannot be greater than the base amount.");
      return false;
    }
    if (requiresDeposit && collectDeposit) {
      const depositPaid = Number(depositCollected || 0);
      if (!Number.isFinite(depositPaid) || depositPaid < 0 || depositPaid > depositAmount) {
        toast.error("Security deposit collected must be between zero and the required deposit.");
        return false;
      }
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateDetails()) return;
    setBusy(true);
    try {
      await createRoomBooking({
        roomId: room._id,
        bookingSource,
        bedCount: isDorm ? bedCount : 1,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim().toLowerCase(),
        guestAge: Number(guestAge),
        guestGender,
        guestCountry: guestCountry.trim(),
        guestState: guestState.trim(),
        guestCity: guestCity.trim(),
        guestAddress: guestAddress.trim(),
        additionalGuests: additionalGuests.map((guest) => ({
          name: guest.name.trim(),
          age: Number(guest.age),
          gender: guest.gender,
        })),
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        checkIn: stayCheckIn,
        checkOut: stayCheckOut,
        notes: notes.trim(),
        idProofType,
        idProofFile,
        paymentMethod,
        paymentTransactionNumber:
          paymentMethod === "Cash" ? undefined : paymentTransactionNumber.trim(),
        discountType,
        discountValue: rawDiscountValue,
        applyTax: taxConfig.enabled ? applyTax : false,
        amountPaid: total,
        requireFullPayment: true,
        securityDepositCollected:
          requiresDeposit && collectDeposit ? depositToCollect : undefined,
        securityDepositPaymentMethod:
          requiresDeposit && collectDeposit && depositToCollect > 0
            ? depositPaymentMethod
            : undefined,
        securityDepositProof:
          requiresDeposit && collectDeposit ? depositProofFile : undefined,
      });
      toast.success("Booking confirmed.");
      await onBooked();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to create this booking."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-xl sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[9px] font-pmedium uppercase tracking-[0.1em] text-blue-600">
              Step {step === "details" ? "1" : "2"} of 2 · {bookingSource}
            </p>
            <h3 className="mt-1 text-[13px] font-pmedium uppercase tracking-widest text-slate-900">
              {step === "details" ? `Book ${room.name}` : "Review booking"}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {step === "details" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
                  Stay dates and live availability
                </p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div>
                    <label className={LABEL}>Check in</label>
                    <input
                      type="date"
                      min={todayInput()}
                      className={FIELD}
                      value={stayCheckIn}
                      onChange={(event) => setStayCheckIn(event.target.value)}
                    />
                    <p className="mt-1 text-[9px] font-pmedium text-slate-400">From {checkTimes.checkInTime}</p>
                  </div>
                  <span className="pb-7 text-[9px] font-pmedium text-slate-400">TO</span>
                  <div>
                    <label className={LABEL}>Check out</label>
                    <input
                      type="date"
                      min={stayCheckIn || todayInput()}
                      className={FIELD}
                      value={stayCheckOut}
                      onChange={(event) => setStayCheckOut(event.target.value)}
                    />
                    <p className="mt-1 text-[9px] font-pmedium text-slate-400">By {checkTimes.checkOutTime} · {nights} night{nights === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className={`mt-3 rounded-lg px-3 py-2 text-[10px] font-pmedium ${availabilityError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {isCheckingDates
                    ? "Checking availability..."
                    : availabilityError ||
                      (isDorm
                        ? `${liveRoom.availableBeds} bed${liveRoom.availableBeds === 1 ? "" : "s"} available for these dates.`
                        : "Room available for these dates.")}
                </div>
              </div>

              <div className={`grid gap-3 ${isDorm ? "sm:grid-cols-2" : ""}`}>
                <div>
                  <label className={LABEL}>Booking source</label>
                  <select
                    className={FIELD}
                    value={bookingSource}
                    onChange={(event) =>
                      setBookingSource(event.target.value as RoomStayBookingSource)
                    }
                  >
                    {BOOKING_SOURCES.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                {isDorm && (
                  <div>
                    <label className={LABEL}>Number of beds</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setBedCount((count) => Math.max(1, count - 1))
                        }
                        disabled={bedCount <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-40"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-10 text-center text-[14px] font-pmedium text-slate-900">
                        {bedCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setBedCount((count) => Math.min(maxBeds, count + 1))
                        }
                        disabled={bedCount >= maxBeds || maxBeds < 1}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-40"
                      >
                        <Plus size={14} />
                      </button>
                      <span className="text-[10px] font-pmedium text-slate-400">
                        of {maxBeds} available for these dates
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
                  Primary guest details
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Full name</label>
                    <input
                      className={FIELD}
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="As shown on ID proof"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Phone number</label>
                    <input
                      type="tel"
                      className={FIELD}
                      value={guestPhone}
                      onChange={(event) => setGuestPhone(event.target.value)}
                      placeholder="Guest contact number"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Email address</label>
                    <input
                      type="email"
                      className={FIELD}
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      placeholder="guest@example.com"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Age</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      className={FIELD}
                      value={guestAge}
                      onChange={(event) => setGuestAge(event.target.value)}
                      placeholder="Guest age"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Gender</label>
                    <select
                      className={FIELD}
                      value={guestGender}
                      onChange={(event) => setGuestGender(event.target.value)}
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Country</label>
                    <select
                      className={FIELD}
                      value={guestCountry}
                      onChange={(event) => setGuestCountry(event.target.value)}
                    >
                      <option value="">Select country</option>
                      {countryOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>State</label>
                    <select
                      className={FIELD}
                      value={guestState}
                      onChange={(event) => setGuestState(event.target.value)}
                      disabled={!guestCountry || isLoadingStates}
                    >
                      <option value="">
                        {!guestCountry
                          ? "Select country first"
                          : isLoadingStates
                            ? "Loading states..."
                            : "Select state"}
                      </option>
                      {stateOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>City</label>
                    <select
                      className={FIELD}
                      value={guestCity}
                      onChange={(event) => setGuestCity(event.target.value)}
                      disabled={!guestCountry || !guestState || isLoadingCities}
                    >
                      <option value="">
                        {!guestCountry || !guestState
                          ? "Select state first"
                          : isLoadingCities
                            ? "Loading cities..."
                            : "Select city"}
                      </option>
                      {cityOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL}>Address</label>
                    <textarea
                      className={FIELD}
                      rows={2}
                      value={guestAddress}
                      onChange={(event) => setGuestAddress(event.target.value)}
                      placeholder="House, building, street and postal code"
                    />
                  </div>
                </div>
              </div>

              {additionalGuests.length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-[0.08em] text-blue-700">
                    Additional guests
                  </p>
                  <p className="mb-3 mt-1 font-pmedium text-[10px] text-slate-500">
                    Add one occupant for each additional bed in this booking.
                  </p>
                  <div className="space-y-3">
                    {additionalGuests.map((guest, index) => (
                      <div
                        key={`additional-guest-${index + 2}`}
                        className="grid gap-3 border-t border-blue-100 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_110px_160px]"
                      >
                        <div>
                          <label className={LABEL}>Guest {index + 2} name</label>
                          <input
                            className={FIELD}
                            value={guest.name}
                            onChange={(event) =>
                              setAdditionalGuests((current) =>
                                current.map((entry, guestIndex) =>
                                  guestIndex === index
                                    ? { ...entry, name: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <label className={LABEL}>Age</label>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            className={FIELD}
                            value={guest.age}
                            onChange={(event) =>
                              setAdditionalGuests((current) =>
                                current.map((entry, guestIndex) =>
                                  guestIndex === index
                                    ? { ...entry, age: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className={LABEL}>Gender</label>
                          <select
                            className={FIELD}
                            value={guest.gender}
                            onChange={(event) =>
                              setAdditionalGuests((current) =>
                                current.map((entry, guestIndex) =>
                                  guestIndex === index
                                    ? { ...entry, gender: event.target.value }
                                    : entry,
                                ),
                              )
                            }
                          >
                            <option value="">Select</option>
                            {GENDER_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
                  Identity and emergency contact
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>
                      <IdCard size={10} className="mr-1 inline" /> ID proof type
                    </label>
                    <select
                      className={FIELD}
                      value={idProofType}
                      onChange={(event) => setIdProofType(event.target.value)}
                    >
                      {ID_PROOF_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                  <label className={LABEL}>
                    ID proof attachment
                  </label>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-pmedium text-slate-500 hover:border-blue-300 hover:text-blue-700">
                    <Upload size={13} />
                    {idProofFile ? idProofFile.name : "Upload photo / scan"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                      className="hidden"
                      onChange={(event) => setIdProofFile(event.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                  <div>
                    <label className={LABEL}>Emergency contact name (optional)</label>
                    <input
                      className={FIELD}
                      value={emergencyContactName}
                      onChange={(event) => setEmergencyContactName(event.target.value)}
                      placeholder="Contact person"
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Emergency contact phone (optional)</label>
                    <input
                      type="tel"
                      className={FIELD}
                      value={emergencyContactPhone}
                      onChange={(event) => setEmergencyContactPhone(event.target.value)}
                      placeholder="Emergency number"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-[10px] font-pmedium uppercase tracking-[0.08em] text-slate-500">
                  Discount &amp; tax
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={LABEL}>Discount type</label>
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setDiscountType("amount")}
                        className={`rounded-lg px-2 py-2 text-[10px] font-pmedium uppercase tracking-widest transition ${
                          discountType === "amount"
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Amount
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("percent")}
                        className={`rounded-lg px-2 py-2 text-[10px] font-pmedium uppercase tracking-widest transition ${
                          discountType === "percent"
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        Percent
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>
                      Discount {discountType === "percent" ? "(%)" : "(flat)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={discountType === "percent" ? 100 : subtotalBeforeDiscount}
                      className={FIELD}
                      value={discountValue}
                      onChange={(event) => setDiscountValue(event.target.value)}
                      placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 500"}
                    />
                  </div>
                </div>
                {taxConfig.enabled && (
                  <label className="mt-3 flex items-center justify-between gap-2 text-[11px] font-pmedium text-slate-500">
                    <span className="uppercase tracking-widest">
                      Apply {taxConfig.label || "Tax"} ({taxConfig.ratePercent}%)
                    </span>
                    <input
                      type="checkbox"
                      checked={applyTax}
                      onChange={(event) => setApplyTax(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                )}
                <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-3 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Base amount</span>
                    <span>{formatCurrency(subtotalBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Discount{discountType === "percent" && rawDiscountValue > 0 ? ` (${rawDiscountValue}%)` : ""}</span>
                    <span>- {formatCurrency(discountAmount)}</span>
                  </div>
                  {(taxConfig.enabled || taxAmount > 0) && (
                    <div className="flex justify-between text-slate-500">
                      <span>
                        {taxConfig.label || "Tax"} ({taxRatePercent}%)
                        {taxConfig.priceIncludesTax ? " (included)" : ""}
                        {!applyTax ? " (not applied)" : ""}
                      </span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-pmedium text-slate-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div className={`grid gap-3 ${paymentMethod === "Cash" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <div>
                  <label className={LABEL}>
                    <Wallet size={10} className="mr-1 inline" /> Payment method
                  </label>
                  <select
                    className={FIELD}
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                {paymentMethod !== "Cash" && (
                  <div>
                    <label className={LABEL}>Transaction / reference number</label>
                    <input
                      className={FIELD}
                      value={paymentTransactionNumber}
                      onChange={(event) => setPaymentTransactionNumber(event.target.value)}
                      placeholder="Enter transaction ID"
                    />
                  </div>
                )}
                <div>
                  <label className={LABEL}>Amount to collect now</label>
                  <div className={`${FIELD} flex items-center justify-between bg-blue-50 text-blue-800`}>
                    <span>{formatCurrency(total)}</span>
                    <span className="text-[9px] uppercase tracking-widest">Full payment</span>
                  </div>
                </div>
              </div>

              {requiresDeposit ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <ShieldCheck size={15} className="mt-0.5 text-amber-600" />
                      <div>
                        <p className="text-[11px] font-pmedium text-amber-900">
                          This {roomType === "Dorm" ? "dorm" : "room"} charges a security deposit of {formatCurrency(depositAmount)}.
                        </p>
                        <p className="mt-0.5 text-[10px] text-amber-700">
                          Collecting it is optional — turn it off to skip straight to the regular payment.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={collectDeposit}
                      onClick={() => setCollectDeposit((value) => !value)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${collectDeposit ? "bg-amber-600" : "bg-slate-300"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${collectDeposit ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  {collectDeposit && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={LABEL}>Deposit collected now</label>
                        <input
                          type="number"
                          min={0}
                          max={depositAmount}
                          className={FIELD}
                          value={depositCollected}
                          onChange={(event) => setDepositCollected(event.target.value)}
                          placeholder={String(depositAmount)}
                        />
                        <div className="mt-1.5 flex gap-2">
                          <button type="button" onClick={() => setDepositCollected("0")} className="text-[9px] font-pmedium text-slate-500 hover:text-blue-600">Collect later</button>
                          <button type="button" onClick={() => setDepositCollected(String(depositAmount))} className="text-[9px] font-pmedium text-blue-600 hover:text-blue-700">Collect full deposit</button>
                        </div>
                      </div>
                      <div>
                        <label className={LABEL}>Deposit payment method</label>
                        <select
                          className={FIELD}
                          value={depositPaymentMethod}
                          onChange={(event) => setDepositPaymentMethod(event.target.value)}
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={LABEL}>Deposit payment proof (optional)</label>
                        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-[11px] font-pmedium text-slate-500 hover:border-blue-300 hover:text-blue-700">
                          <Upload size={13} />
                          {depositProofFile ? depositProofFile.name : "Upload receipt / screenshot"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                            className="hidden"
                            onChange={(event) => setDepositProofFile(event.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div>
                <label className={LABEL}>Notes (optional)</label>
                <textarea
                  className={FIELD}
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <ReviewItem label="Booking source" value={bookingSource} />
                <ReviewItem label={roomType === "Dorm" ? "Dorm" : "Room"} value={room.name} />
                {isDorm && <ReviewItem label="Beds" value={`${bedCount} of ${room.availableBeds} available`} />}
                <ReviewItem label="Guest" value={guestName.trim()} />
                <ReviewItem label="Phone" value={guestPhone.trim()} />
                <ReviewItem label="Email" value={guestEmail.trim()} />
                <ReviewItem label="Age / gender" value={`${guestAge} · ${guestGender}`} />
                <ReviewItem
                  label="Location"
                  value={`${guestCity.trim()}, ${guestState.trim()}, ${guestCountry.trim()}`}
                />
                <ReviewItem label="Address" value={guestAddress.trim()} />
                {additionalGuests.map((guest, index) => (
                  <ReviewItem
                    key={`review-additional-guest-${index + 2}`}
                    label={`Guest ${index + 2}`}
                    value={`${guest.name.trim()} · ${guest.age} years · ${guest.gender}`}
                  />
                ))}
                {emergencyContactName && (
                  <ReviewItem
                    label="Emergency contact"
                    value={`${emergencyContactName.trim()} · ${emergencyContactPhone.trim()}`}
                  />
                )}
                <ReviewItem label="Stay" value={`${stayCheckIn} to ${stayCheckOut}`} />
                <ReviewItem label="Duration" value={`${nights} night${nights === 1 ? "" : "s"}`} />
                <ReviewItem label="ID proof" value={idProofFile ? `${idProofType} · ${idProofFile.name}` : "Collect at check-in"} />
                {discountAmount > 0 && (
                  <ReviewItem
                    label="Discount"
                    value={`${formatCurrency(discountAmount)}${discountType === "percent" ? ` (${rawDiscountValue}%)` : ""}`}
                  />
                )}
                <ReviewItem label="Payment" value={`${formatCurrency(total)} paid via ${paymentMethod}`} />
                {paymentMethod !== "Cash" && (
                  <ReviewItem
                    label="Transaction number"
                    value={paymentTransactionNumber.trim()}
                  />
                )}
                {requiresDeposit && (
                  <ReviewItem
                    label="Security deposit"
                    value={
                      collectDeposit
                        ? `${formatCurrency(depositToCollect)} of ${formatCurrency(depositAmount)} via ${depositPaymentMethod}`
                        : `${formatCurrency(depositAmount)} not collected now`
                    }
                  />
                )}
              </div>
              <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-[12px]">
                <div className="flex justify-between text-slate-500"><span>Rate × {nights} night{nights === 1 ? "" : "s"}{isDorm ? ` × ${bedCount} bed${bedCount === 1 ? "" : "s"}` : ""}</span><span>{formatCurrency(subtotalBeforeDiscount)}</span></div>
                <div className="flex justify-between text-slate-500">
                  <span>Discount{discountType === "percent" && rawDiscountValue > 0 ? ` (${rawDiscountValue}%)` : ""}</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
                {(taxConfig.enabled || taxAmount > 0) && (
                  <div className="flex justify-between text-slate-500">
                    <span>
                      {taxConfig.label || "Tax"} ({taxRatePercent}%){!applyTax ? " (not applied)" : ""}
                    </span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-blue-100 pt-2 font-pmedium text-slate-900"><span>Paid now</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between text-emerald-700"><span>Balance due</span><span>{formatCurrency(0)}</span></div>
                {requiresDeposit && collectDeposit && (
                  <div className="flex justify-between text-amber-700"><span>Security deposit collected</span><span>{formatCurrency(depositToCollect)}</span></div>
                )}
              </div>
              <p className="text-[10px] font-pmedium leading-5 text-slate-500">
                Confirming creates the booking and blocks {isDorm ? `${bedCount} bed${bedCount === 1 ? "" : "s"}` : "this room"} for the selected dates.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {step === "details" ? (
            <>
              <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Cancel</button>
              <button type="button" onClick={() => validateDetails() && setStep("review")} className={PRIMARY_BUTTON}>Review booking</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep("details")} className={SECONDARY_BUTTON}>Back to edit</button>
              <button type="button" onClick={handleConfirm} disabled={busy} className={PRIMARY_BUTTON}>{busy ? "Confirming..." : "Confirm booking"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-pmedium uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-[11px] font-pmedium text-slate-900">{value}</p>
    </div>
  );
}

function CurrentGuestsTab({
  roomType,
  noun,
  formatCurrency,
}: {
  roomType: GuestRoomType;
  noun: string;
  formatCurrency: (value?: number) => string;
}) {
  const { prompt } = useAppConfirm();
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getRoomBookings({ scope: "open", roomType });
      setBookings(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load guests."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType]);

  const [extending, setExtending] = useState<RoomStayBooking | null>(null);

  const changeStatus = async (
    booking: RoomStayBooking,
    status: RoomStayStatus,
  ) => {
    setBusyId(booking._id);
    try {
      const res = await updateRoomBookingStatus(booking._id, status);
      toast.success(res?.data?.message || `Marked ${status}.`);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update this booking."));
    } finally {
      setBusyId(null);
    }
  };

  const cancelBooking = async (booking: RoomStayBooking) => {
    const result = await prompt({
      title: "Cancel booking",
      message: `Cancel booking #${booking.bookingNumber} for ${booking.guestName}?`,
      fields: [
        {
          name: "reason",
          label: "Reason",
          placeholder: "e.g. Guest cancelled",
        },
      ],
      confirmLabel: "Cancel booking",
    });
    if (!result) return;
    setBusyId(booking._id);
    try {
      await updateRoomBookingStatus(booking._id, "Cancelled", result.reason);
      toast.success("Booking cancelled.");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to cancel this booking."));
    } finally {
      setBusyId(null);
    }
  };

  const checkedIn = bookings.filter(
    (booking) => booking.status === "Checked-in",
  ).length;
  const upcoming = bookings.filter(
    (booking) => booking.status === "Booked",
  ).length;
  const totalValue = bookings.reduce(
    (sum, booking) => sum + Number(booking.total || 0),
    0,
  );

  return (
    <>
      <SummaryCards
        cards={[
          {
            key: "total",
            icon: Users,
            label: "Current Guests",
            value: String(bookings.length),
            cardClass: baseCardClass,
            iconClass: "bg-blue-50 text-blue-600",
          },
          {
            key: "checkedin",
            icon: LogIn,
            label: "Checked-in",
            value: String(checkedIn),
            cardClass: `${baseCardClass} border-l-4 border-l-emerald-500`,
            iconClass: "bg-emerald-50 text-emerald-600",
          },
          {
            key: "upcoming",
            icon: Calendar,
            label: "Upcoming",
            value: String(upcoming),
            cardClass: `${baseCardClass} border-l-4 border-l-sky-500`,
            iconClass: "bg-sky-50 text-sky-600",
          },
          {
            key: "value",
            icon: TrendingUp,
            label: "Total Value",
            value: formatCurrency(totalValue),
            cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`,
            iconClass: "bg-indigo-50 text-indigo-600",
          },
        ]}
      />
      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr>
                <th className={TH}>Booking</th>
                <th className={TH}>Guest</th>
                <th className={TH}>{noun}</th>
                <th className={TH}>Dates</th>
                <th className={TH}>Checked-in At</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <EmptyRow colSpan={8} message="Loading..." />
              ) : bookings.length === 0 ? (
                <EmptyRow colSpan={8} message="No current guests." />
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="transition-all hover:bg-blue-50/30"
                  >
                    <td className={TD}>#{booking.bookingNumber}</td>
                    <td className={TD}>
                      {booking.guestName}
                      {booking.guestPhone && (
                        <span className="flex items-center gap-1 text-[10px] font-pmedium text-slate-400">
                          <Phone size={10} /> {booking.guestPhone}
                        </span>
                      )}
                    </td>
                    <td className={`${TD} text-slate-600`}>
                      {formatBedLabel(booking)}
                    </td>
                    <td className={`${TD} text-slate-500`}>
                      {booking.checkIn.slice(0, 10)} →{" "}
                      {booking.checkOut.slice(0, 10)} ({booking.nights}n)
                    </td>
                    <td className={`${TD} text-slate-500`}>
                      {formatDateTime(booking.actualCheckInAt)}
                    </td>
                    <td className={`${TD} text-right`}>
                      {formatCurrency(booking.total)}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <span className={pill(STATUS_TONE[booking.status])}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {booking.status === "Booked" && (
                          <button
                            type="button"
                            onClick={() => changeStatus(booking, "Checked-in")}
                            disabled={busyId === booking._id}
                            className={SECONDARY_BUTTON}
                            title="Check in"
                          >
                            <LogIn size={13} />
                          </button>
                        )}
                        {booking.status === "Checked-in" && (
                          <button
                            type="button"
                            onClick={() => changeStatus(booking, "Checked-out")}
                            disabled={busyId === booking._id}
                            className={SECONDARY_BUTTON}
                            title="Check out"
                          >
                            <LogOut size={13} />
                          </button>
                        )}
                        {booking.status === "Checked-in" && (
                          <button
                            type="button"
                            onClick={() => setExtending(booking)}
                            disabled={busyId === booking._id}
                            className={SECONDARY_BUTTON}
                            title="Extend stay"
                          >
                            <PlusCircle size={13} />
                          </button>
                        )}
                        {booking.status === "Booked" && (
                          <button
                            type="button"
                            onClick={() => cancelBooking(booking)}
                            disabled={busyId === booking._id}
                            className="rounded-2xl px-3 py-2.5 text-[10px] font-pmedium uppercase tracking-widest text-rose-600 hover:bg-rose-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {extending && (
        <ExtendStayDialog
          booking={extending}
          formatCurrency={formatCurrency}
          onClose={() => setExtending(null)}
          onExtended={async () => {
            setExtending(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function ExtendStayDialog({
  booking,
  formatCurrency,
  onClose,
  onExtended,
}: {
  booking: RoomStayBooking;
  formatCurrency: (value?: number) => string;
  onClose: () => void;
  onExtended: () => Promise<void>;
}) {
  const [checkOut, setCheckOut] = useState(todayInput());
  const [busy, setBusy] = useState(false);

  const handleExtend = async () => {
    setBusy(true);
    try {
      await extendRoomBooking(booking._id, checkOut);
      toast.success("Stay extended successfully.");
      await onExtended();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to extend this stay."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-md sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-[13px] font-pmedium uppercase tracking-widest text-slate-900">
            Extend Stay — #{booking.bookingNumber}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="rounded-xl bg-slate-50 p-3 text-[12px] font-pmedium text-slate-600">
            Current check-out: {booking.checkOut.slice(0, 10)} ·{" "}
            {formatCurrency(booking.ratePerNight)} / night
          </div>
          <div>
            <label className={LABEL}>New check-out date</label>
            <input
              type="date"
              className={FIELD}
              value={checkOut}
              min={booking.checkOut.slice(0, 10)}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExtend}
            disabled={busy}
            className={PRIMARY_BUTTON}
          >
            Extend Stay
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({
  roomType,
  noun,
  formatCurrency,
}: {
  roomType: GuestRoomType;
  noun: string;
  formatCurrency: (value?: number) => string;
}) {
  const [bookings, setBookings] = useState<RoomStayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getRoomBookings({
      scope: "history",
      roomType,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    })
      .then((res) => {
        if (!cancelled)
          setBookings(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch((error) => {
        if (!cancelled)
          toast.error(getErrorMessage(error, "Unable to load history."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomType, from, to]);

  const filtered = bookings.filter((booking) => {
    if (!query.trim()) return true;
    const needle = query.trim().toLowerCase();
    return (
      String(booking.bookingNumber).includes(needle) ||
      booking.guestName.toLowerCase().includes(needle)
    );
  });

  const checkedOut = bookings.filter(
    (booking) => booking.status === "Checked-out",
  ).length;
  const cancelled = bookings.filter(
    (booking) => booking.status === "Cancelled",
  ).length;
  const revenue = bookings
    .filter((booking) => booking.status === "Checked-out")
    .reduce((sum, booking) => sum + Number(booking.total || 0), 0);

  return (
    <>
      <SummaryCards
        cards={[
          {
            key: "total",
            icon: Bed,
            label: "Total Bookings",
            value: String(bookings.length),
            cardClass: baseCardClass,
            iconClass: "bg-blue-50 text-blue-600",
          },
          {
            key: "checkedout",
            icon: LogOut,
            label: "Checked-out",
            value: String(checkedOut),
            cardClass: `${baseCardClass} border-l-4 border-l-slate-400`,
            iconClass: "bg-slate-100 text-slate-600",
          },
          {
            key: "cancelled",
            icon: XCircle,
            label: "Cancelled",
            value: String(cancelled),
            cardClass: `${baseCardClass} border-l-4 border-l-rose-500`,
            iconClass: "bg-rose-50 text-rose-600",
          },
          {
            key: "revenue",
            icon: TrendingUp,
            label: "Revenue",
            value: formatCurrency(revenue),
            cardClass: `${baseCardClass} border-l-4 border-l-indigo-500`,
            iconClass: "bg-indigo-50 text-indigo-600",
          },
        ]}
      />
      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className={TOOLBAR}>
          <div className="relative w-full xl:w-72">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              className={SEARCH_INPUT}
              placeholder="Search booking # or guest..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={`${FIELD} w-auto`}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              className={`${FIELD} w-auto`}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
              <tr>
                <th className={TH}>Booking</th>
                <th className={TH}>Guest</th>
                <th className={TH}>{noun}</th>
                <th className={TH}>Dates</th>
                <th className={TH}>Actual Check-in / Out</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-center`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <EmptyRow colSpan={7} message="Loading..." />
              ) : filtered.length === 0 ? (
                <EmptyRow
                  colSpan={7}
                  message="No bookings match these filters."
                />
              ) : (
                filtered.map((booking) => (
                  <tr
                    key={booking._id}
                    className="transition-all hover:bg-blue-50/30"
                  >
                    <td className={TD}>#{booking.bookingNumber}</td>
                    <td className={TD}>{booking.guestName}</td>
                    <td className={`${TD} text-slate-600`}>
                      {formatBedLabel(booking)}
                    </td>
                    <td className={`${TD} text-slate-500`}>
                      {booking.checkIn.slice(0, 10)} →{" "}
                      {booking.checkOut.slice(0, 10)}
                    </td>
                    <td className={`${TD} text-slate-500`}>
                      {formatDateTime(booking.actualCheckInAt)} →{" "}
                      {formatDateTime(booking.actualCheckOutAt)}
                      {booking.lateFeeAmount > 0 && (
                        <span className="block text-[10px] text-amber-600">
                          Late fee: {formatCurrency(booking.lateFeeAmount)}
                        </span>
                      )}
                    </td>
                    <td className={`${TD} text-right`}>
                      {formatCurrency(booking.total)}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <span
                        className={pill(STATUS_TONE[booking.status])}
                        title={
                          booking.status === "Cancelled" && booking.cancelReason
                            ? `Reason: ${booking.cancelReason}`
                            : undefined
                        }
                      >
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
