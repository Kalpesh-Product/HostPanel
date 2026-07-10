import { MdOutlineTravelExplore, MdOutlineRateReview } from "react-icons/md";
import Card from "../../../components/Card";
import PageFrame from "../../../components/Pages/PageFrame";
import { ShieldCheck } from "lucide-react";

const WonoNomad = () => {
  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                
                Wono Nomads
              </h2>
              {/* <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage your co-working and co-living space listings and reviews.
              </p> */}
            </div>
          </div>

          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              icon={<MdOutlineTravelExplore />}
              title="Nomad Listings"
              route="/company-settings/nomad-listings"
            />
            <Card
              icon={<MdOutlineRateReview />}
              title="Reviews"
              route="/company-settings/reviews"
            />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WonoNomad;
