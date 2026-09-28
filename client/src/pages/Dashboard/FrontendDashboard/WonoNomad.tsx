import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MdOutlineTravelExplore, MdOutlineRateReview } from "react-icons/md";
import Card from "../../../components/Card";
import PageFrame from "../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { ContactRound, BadgeCheck } from "lucide-react";

const VERIFY_LOCKED_REASON =
  "Add and activate a listing — or get your existing wono.co listings approved — to unlock Verify Business.";

const WonoNomad = () => {
  const axiosPrivate = useAxiosPrivate();

  // Same query (and cache entry) the Verify Business page uses.
  const { data: overview, isPending, isError } = useQuery({
    queryKey: ["verify-business-overview"],
    queryFn: async () => (await axiosPrivate.get("/api/verify-business/overview")).data,
    retry: false,
  });

  // Follows the Verify Business page's own rule: open once the host has an
  // active, public listing or an approved claim on existing listings. A host
  // who already has a verification record can always get in to manage it.
  // While loading, or if the check itself fails, don't lock anyone out.
  const verifyLocked =
    !isPending && !isError && !overview?.eligible && !overview?.verification;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">

                Nomad Listings
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage your co-working and co-living space listings, reviews, and leads.
              </p>
            </div>
          </div>

          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div data-tour="wono-nomad-listings">
              <Card
                icon={<MdOutlineTravelExplore />}
                title="Listings"
                route="/key-apps/nomad-listings"
              />
            </div>
            <div data-tour="wono-nomad-reviews">
              <Card
                icon={<MdOutlineRateReview />}
                title="Reviews"
                route="/key-apps/reviews"
              />
            </div>
            <div data-tour="wono-nomad-leads">
              <Card
                icon={<ContactRound />}
                title="Leads"
                route="/key-apps/nomads-leads"
              />
            </div>
            <div data-tour="wono-nomad-verify-business">
              <Card
                icon={<BadgeCheck />}
                title="Verify Business"
                route="/key-apps/verify-business"
                locked={verifyLocked}
                lockReason={VERIFY_LOCKED_REASON}
                onClick={verifyLocked ? () => toast(VERIFY_LOCKED_REASON) : undefined}
              />
            </div>
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WonoNomad;
