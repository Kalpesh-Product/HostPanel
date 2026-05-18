import { LuHardDriveUpload } from "react-icons/lu";
import { SiGoogleadsense } from "react-icons/si";
import Card from "../../../../components/Card";

const WebsiteBuilderTypeActions = ({ type = "static" }) => {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="themePage-content-header bg-white flex flex-col gap-4">
        <h4 className="text-4xl text-left">
          {type === "dynamic" ? "Dynamic Website" : "Static Website"}
        </h4>
        <hr />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card icon={<LuHardDriveUpload />} title="Create Website" route="create-website" />
        <Card icon={<SiGoogleadsense />} title="Leads" route="leads" />
      </div>
    </div>
  );
};

export default WebsiteBuilderTypeActions;

