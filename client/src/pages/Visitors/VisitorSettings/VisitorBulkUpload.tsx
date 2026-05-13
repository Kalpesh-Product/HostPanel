import { IoMdDownload } from "react-icons/io";
import { MdUpload } from "react-icons/md";
import WidgetSection from "../../../components/WidgetSection";
import AgTable from "../../../components/AgTable";

const VisitorBulkUpload = () => {
  const uploadItems = ["Upload Visitors"];
  const bulkUploadDataColumns = [
    { field: "srNo", headerName: "SR No", flex: 1 },
    { field: "templateName", headerName: "Template Name", flex: 1 },
    { field: "uploadedBy", headerName: "Uploaded By", flex: 1 },
    { field: "date", headerName: "Date", flex: 1 },
  ];

  return (
    <div className="">
      <h2 className="text-title font-pmedium text-primary pb-4">
        Bulk Upload Data
      </h2>

      <div className="grid lg:grid-cols-3 md:grid-col-3 sm:grid-col-1 pb-4">
        {uploadItems.map((item, index) => {
          return (
            <div key={`${item}-${index}`}>
              <div
                className="space-y-2 border-default p-4  rounded-md"
              >
                <div className="mb-2">{item}</div>
                <div className="flex space-x-2">
                  {/* Placeholder Input Box */}
                  <div className="flex items-end w-full border border-gray-200 rounded-md">
                    <span className="text-white bg-gray-600 rounded-md p-2 ml-auto">
                      Choose file
                    </span>
                  </div>

                  {/* Filter Button */}
                  <button
                    className="bg-[#48BBCC] p-2"
                    type="button"
                    aria-label="Upload visitors"
                    title="Upload visitors"
                  >
                    <MdUpload style={{ fill: "white" }} />
                  </button>
                  <button
                    className="bg-[#48BBCC] p-2"
                    type="button"
                    aria-label="Download template"
                    title="Download template"
                  >
                    <IoMdDownload style={{ fill: "white" }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <WidgetSection border title="Bulk Upload Data">
          <AgTable
            data={[]}
            columns={bulkUploadDataColumns}
            search={true}
          />
        </WidgetSection>
      </div>
    </div>
  );
};

export default VisitorBulkUpload;
