import { CgWebsite } from "react-icons/cg";
import { LuWorkflow } from "react-icons/lu";
import Card from "../../../../components/Card";
import PageFrame from "../../../../components/Pages/PageFrame";

const WebsiteTypeSelector = () => {
  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <h2 className="text-title font-pmedium text-primary uppercase">
            Website Builder
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card icon={<CgWebsite />} title="Static Website" route="static" />
            <Card icon={<LuWorkflow />} title="Dynamic Website" route="dynamic" />
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default WebsiteTypeSelector;
