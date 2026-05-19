import { CgWebsite } from "react-icons/cg";
import { LuWorkflow } from "react-icons/lu";
import Card from "../../../../components/Card";

const WebsiteTypeSelector = () => {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="themePage-content-header bg-white flex flex-col gap-4">
        <h4 className="text-4xl text-left">Website Builder</h4>
        <hr />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={<CgWebsite />} title="Static Website" route="static" />
        <Card icon={<LuWorkflow />} title="Dynamic Website" route="dynamic" />
      </div>
    </div>
  );
};

export default WebsiteTypeSelector;

