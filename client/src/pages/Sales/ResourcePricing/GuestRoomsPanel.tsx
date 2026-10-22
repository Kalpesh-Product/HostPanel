import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bed, CheckCircle2, ChevronDown, Edit2, Loader2, Plus, Save, Search, Tag, Trash2, X, XCircle } from "lucide-react";
import { useAppConfirm } from "../../../components/app/AppConfirmProvider";
import useWorkspacePreferences from "../../../hooks/useWorkspacePreferences";
import { formatWorkspaceCurrency } from "../../../lib/workspaceLocalization";
import { getResources } from "../../../services/resources";
import {
  createGuestRoom,
  deleteGuestRoom,
  getGuestRooms,
  updateGuestRoom,
  type GuestRoom,
  type GuestRoomType,
} from "../../../services/roomStays";

const baseCardClass =
  "bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md";
const FIELD =
  "w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500";
const LABEL = "text-[10px] font-pmedium text-slate-500 uppercase tracking-widest";
const ACTION_BUTTON =
  "rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600";
const DELETE_BUTTON =
  "rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600";
const ADD_BUTTON =
  "bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap";
const SEARCH_INPUT =
  "w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500";

const ADD_NEW_OPTION = "__add_new__";

const AMENITY_OPTIONS = [
  "WiFi",
  "Air Conditioning",
  "Attached Bathroom",
  "Hot Water",
  "TV",
  "Breakfast Included",
  "Locker",
  "Power Backup",
  "Laundry",
  "Housekeeping",
  "Parking",
  "Elevator Access",
];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const pillClass = (tone: "emerald" | "amber" | "slate") => {
  const tones = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-pmedium uppercase tracking-widest ${tones[tone]}`;
};

export default function GuestRoomsPanel({ type }: { type: GuestRoomType }) {
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (value = 0) =>
    formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 2 });
  const { confirm } = useAppConfirm();

  const [rooms, setRooms] = useState<GuestRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ room?: GuestRoom } | null>(null);
  // Location/Floor/Wing options shared across Resources, Rooms and Dorms, so a value
  // added on one of those tabs shows up as an option on the others too.
  const [sharedLocations, setSharedLocations] = useState<string[]>([]);
  const [sharedFloors, setSharedFloors] = useState<string[]>([]);
  const [sharedWings, setSharedWings] = useState<string[]>([]);

  const noun = type === "Room" ? "Room" : "Dorm";

  useEffect(() => {
    Promise.all([getResources(), getGuestRooms()])
      .then(([resourcesRes, roomsRes]) => {
        const resources = resourcesRes?.data?.data?.resources || resourcesRes?.data?.resources || [];
        const allRooms = Array.isArray(roomsRes?.data?.data) ? roomsRes.data.data : [];
        const merged = [...resources, ...allRooms] as Array<{ location?: string; floor?: string; wing?: string }>;
        setSharedLocations(Array.from(new Set(merged.map((item) => String(item.location || "").trim()).filter(Boolean))));
        setSharedFloors(Array.from(new Set(merged.map((item) => String(item.floor || "").trim()).filter(Boolean))));
        setSharedWings(Array.from(new Set(merged.map((item) => String(item.wing || "").trim().toUpperCase()).filter(Boolean))));
      })
      .catch(() => {
        // Location/Floor/Wing dropdowns just fall back to this room's own existing values.
      });
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await getGuestRooms(type);
      setRooms(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (error) {
      toast.error(getErrorMessage(error, `Unable to load ${noun.toLowerCase()}s.`));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const filtered = rooms.filter((room) => !query.trim() || room.name.toLowerCase().includes(query.trim().toLowerCase()));
  const active = rooms.filter((room) => room.isActive).length;

  const handleToggleActive = async (room: GuestRoom) => {
    try {
      await updateGuestRoom(room._id, { isActive: !room.isActive });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to update this room."));
    }
  };

  const handleDelete = async (room: GuestRoom) => {
    const approved = await confirm({ title: `Delete ${noun.toLowerCase()}?`, message: `Remove ${room.name}? This cannot be undone.`, confirmLabel: "Delete" });
    if (!approved) return;
    try {
      await deleteGuestRoom(room._id);
      toast.success(`${noun} removed.`);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, `Unable to remove this ${noun.toLowerCase()}.`));
    }
  };

  return (
    <>
      <div className="mb-3 mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className={baseCardClass}>
          <div><p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Total {noun}s</p><p className="text-[15px] font-pmedium text-slate-900">{rooms.length}</p></div>
          <div className="rounded-2xl p-2 shrink-0 bg-blue-50 text-blue-600"><Bed size={16} /></div>
        </div>
        <div className={`${baseCardClass} border-l-4 border-l-emerald-500`}>
          <div><p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Active</p><p className="text-[15px] font-pmedium text-slate-900">{active}</p></div>
          <div className="rounded-2xl p-2 shrink-0 bg-emerald-50 text-emerald-600"><CheckCircle2 size={16} /></div>
        </div>
        <div className={`${baseCardClass} border-l-4 border-l-red-500`}>
          <div><p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-1">Inactive</p><p className="text-[15px] font-pmedium text-slate-900">{rooms.length - active}</p></div>
          <div className="rounded-2xl p-2 shrink-0 bg-red-50 text-red-600"><XCircle size={16} /></div>
        </div>
      </div>

      <div className="flex min-h-110 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
          <div className="relative w-full xl:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={SEARCH_INPUT} placeholder={`Search ${noun.toLowerCase()}s...`} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => setDialog({})} className={ADD_BUTTON}>
              <Plus size={13} strokeWidth={3} /> ADD {noun.toUpperCase()}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading...</div>
          ) : (
            <table className="min-w-[760px] w-full text-left">
              <thead className="sticky top-0 z-10 text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                <tr>
                  <th className="px-3.5 py-2">{noun}</th>
                  {type === "Dorm" && <th className="px-3.5 py-2 text-center">Beds</th>}
                  <th className="px-3.5 py-2 text-right">Price / night</th>
                  <th className="px-3.5 py-2">Location</th>
                  <th className="px-3.5 py-2 text-center">Status</th>
                  <th className="px-3.5 py-2 text-center">Active</th>
                  <th className="px-3.5 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={type === "Dorm" ? 7 : 6} className="bg-slate-50/50 py-20 text-center text-slate-400">
                      <p className="text-sm font-pmedium">{rooms.length === 0 ? `No ${noun.toLowerCase()}s yet. Add your first one.` : `No ${noun.toLowerCase()}s match your search.`}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((room) => (
                    <tr key={room._id} className="transition-all hover:bg-blue-50/30">
                      <td className="px-3.5 py-2">
                        <p className="text-[12px] font-pmedium text-slate-900">{room.name}</p>
                        {room.amenities && room.amenities.length > 0 && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{room.amenities.join(" · ")}</p>
                        )}
                      </td>
                      {type === "Dorm" && <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700 text-center">{room.capacity}</td>}
                      <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-900 text-right">{formatCurrency(room.pricePerNight)}</td>
                      <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500">{[room.location, room.floor, room.wing].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3.5 py-2 text-center">
                        <span className={pillClass(room.status === "Active" ? "emerald" : room.status === "Under Maintenance" ? "amber" : "slate")}>{room.status}</span>
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <input type="checkbox" checked={room.isActive} onChange={() => handleToggleActive(room)} aria-label={`Toggle ${room.name}`} />
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => setDialog({ room })} className={ACTION_BUTTON} title={`Edit ${noun}`}><Edit2 size={14} /></button>
                          <button type="button" onClick={() => handleDelete(room)} className={DELETE_BUTTON} title={`Remove ${noun}`}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {dialog && (
        <RoomDialog
          type={type}
          room={dialog.room}
          existingRooms={rooms}
          sharedLocations={sharedLocations}
          sharedFloors={sharedFloors}
          sharedWings={sharedWings}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function FormSectionHeader({ icon: Icon, label }: { icon: typeof Bed; label: string }) {
  return (
    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Icon size={16} /></span>
      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">{label}</span>
    </h4>
  );
}

function DropdownOrCustomField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [mode, setMode] = useState<"select" | "custom">("select");
  return (
    <div className="space-y-1">
      <label className={LABEL}>{label}{required ? " *" : ""}</label>
      {mode === "custom" ? (
        <div className="space-y-1.5">
          <input
            required={required}
            type="text"
            className={FIELD}
            placeholder={`Enter new ${label.toLowerCase()}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              setMode("select");
              onChange("");
            }}
            className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600"
          >
            Back to dropdown
          </button>
        </div>
      ) : (
        <div className="relative">
          <select
            required={required}
            className={`${FIELD} appearance-none cursor-pointer pr-8`}
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              if (next === ADD_NEW_OPTION) {
                setMode("custom");
                onChange("");
                return;
              }
              onChange(next);
            }}
          >
            <option value="">Select {label.toLowerCase()}</option>
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
            <option value={ADD_NEW_OPTION}>Add new {label.toLowerCase()}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        </div>
      )}
    </div>
  );
}

function RoomDialog({
  type,
  room,
  existingRooms,
  sharedLocations,
  sharedFloors,
  sharedWings,
  onClose,
  onSaved,
}: {
  type: GuestRoomType;
  room?: GuestRoom;
  existingRooms: GuestRoom[];
  sharedLocations: string[];
  sharedFloors: string[];
  sharedWings: string[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const noun = type === "Room" ? "Room" : "Dorm";
  const [name, setName] = useState(room?.name || "");
  const [capacity, setCapacity] = useState(String(room?.capacity ?? (type === "Dorm" ? 4 : 1)));
  const [pricePerNight, setPricePerNight] = useState(room ? String(room.pricePerNight) : "");
  const [location, setLocation] = useState(room?.location || "");
  const [floor, setFloor] = useState(room?.floor || "");
  const [wing, setWing] = useState(room?.wing || "");
  const [status, setStatus] = useState<GuestRoom["status"]>(room?.status || "Active");
  const [description, setDescription] = useState(room?.description || "");
  const [amenities, setAmenities] = useState<string[]>(room?.amenities || []);
  const [busy, setBusy] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) => (prev.includes(amenity) ? prev.filter((entry) => entry !== amenity) : [...prev, amenity]));
  };

  const availableLocations = Array.from(new Set([...existingRooms.map((entry) => entry.location), ...sharedLocations].filter(Boolean)));
  const availableFloors = Array.from(new Set([...existingRooms.map((entry) => entry.floor), ...sharedFloors].filter(Boolean)));
  const availableWings = Array.from(new Set([...existingRooms.map((entry) => entry.wing), ...sharedWings].filter(Boolean)));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error(`${noun} name is required.`);
    if (pricePerNight === "" || Number(pricePerNight) < 0) return toast.error("Enter a valid nightly rate.");
    if (type === "Dorm") {
      const numericCapacity = Number(capacity);
      if (!Number.isInteger(numericCapacity) || numericCapacity < 1) return toast.error("Beds must be at least 1.");
    }

    const payload = {
      name: name.trim(),
      capacity: type === "Dorm" ? Number(capacity) : 1,
      pricePerNight: Number(pricePerNight),
      location: location.trim(),
      floor: floor.trim(),
      wing: wing.trim(),
      status,
      description: description.trim(),
      amenities,
    };

    setBusy(true);
    try {
      if (room) {
        await updateGuestRoom(room._id, payload as any);
        toast.success(`${noun} updated.`);
      } else {
        await createGuestRoom({ ...payload, type });
        toast.success(`${noun} added.`);
      }
      await onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error, `Unable to save this ${noun.toLowerCase()}.`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        onClick={(event) => event.stopPropagation()}
        className="bg-white/95 backdrop-blur-xl w-full h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 sm:max-w-2xl"
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

        <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-pmedium text-primary tracking-tight truncate">{room ? `Edit ${noun}` : `Add New ${noun}`}</h2>
            <p className="text-[9px] sm:text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-2 truncate">
              {room ? `Edit ${noun.toLowerCase()} details and nightly rate.` : `Create a new ${noun.toLowerCase()} with pricing.`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm shrink-0">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <FormSectionHeader icon={Bed} label={`${noun} Details`} />

              <div className="space-y-1">
                <label className={LABEL}>{noun} Name *</label>
                <input required type="text" className={FIELD} placeholder={type === "Dorm" ? "e.g. Dorm A" : "e.g. Room 101"} value={name} onChange={(event) => setName(event.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <DropdownOrCustomField label="Location" value={location} options={availableLocations} onChange={setLocation} />
                <DropdownOrCustomField label="Floor" value={floor} options={availableFloors} onChange={setFloor} />
                <DropdownOrCustomField label="Wing" value={wing} options={availableWings} onChange={setWing} />
              </div>

              {type === "Dorm" && (
                <div className="space-y-1">
                  <label className={LABEL}>Beds *</label>
                  <input required type="number" min="1" className={FIELD} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
                </div>
              )}

              <div className="space-y-1">
                <label className={LABEL}>Status</label>
                <div className="relative">
                  <select className={`${FIELD} appearance-none cursor-pointer pr-8`} value={status} onChange={(event) => setStatus(event.target.value as GuestRoom["status"])}>
                    <option value="Active">Active</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={LABEL}>Description</label>
                <textarea rows={2} placeholder="Add a short description (optional)..." className={`${FIELD} resize-none`} value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <FormSectionHeader icon={CheckCircle2} label="Amenities / Inclusions" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-pmedium text-slate-700 cursor-pointer hover:border-blue-200">
                    <input type="checkbox" checked={amenities.includes(amenity)} onChange={() => toggleAmenity(amenity)} />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <FormSectionHeader icon={Tag} label="Pricing" />
              <div className="space-y-1">
                <label className={LABEL}>Price Per Night *</label>
                <input required type="number" min="0" step="0.01" placeholder="e.g. 1500" className={FIELD} value={pricePerNight} onChange={(event) => setPricePerNight(event.target.value)} />
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2.5 rounded-xl font-pmedium text-[10px] uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {busy ? "Saving..." : room ? "Save Changes" : `Create ${noun}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
