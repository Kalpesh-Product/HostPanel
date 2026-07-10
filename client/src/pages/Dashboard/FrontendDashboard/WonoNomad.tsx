import { MdOutlineTravelExplore, MdOutlineRateReview } from "react-icons/md";
import Card from "../../../components/Card";
import PageFrame from "../../../components/Pages/PageFrame";

const WonoNomad = () => {
  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Wono Nomads
          </h2>

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
