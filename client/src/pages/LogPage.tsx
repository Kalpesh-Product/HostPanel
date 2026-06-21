import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import YearWiseTable from "../components/Tables/YearWiseTable";
import humanDate from "../utils/humanDateForamt";
import humanTime from "../utils/humanTime";
import DetalisFormatted from "../components/DetalisFormatted";
import MuiModal from "../components/MuiModal";

const LogPage = () => {
  const axios = useAxiosPrivate();
  const [openModal, setOpenModal] = useState(false);
  const [selectedLog, setselectedLog] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ["log"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/logs/get-logs");
        return response.data;
      } catch (error: any) {
        console.error(error.response?.data?.message);
        return [];
      }
    },
  });

  const handleViewlog = (log: Record<string, any>) => {
    setselectedLog(log);
    setOpenModal(true);
  };

  const columns = [
    { headerName: "Sr No", field: "srNo", width: 80 },
    {
      headerName: "Action",
      field: "action",
      flex: 1,
      cellRenderer: (params: any) => (
        <div role="button" onClick={() => handleViewlog(params.data.payload)}>
          <span className="underline text-primary cursor-pointer">
            {params.value}
          </span>
        </div>
      ),
    },
    { headerName: "User", field: "user", flex: 1 },
    { headerName: "Path", field: "path", flex: 1 },
    {
      headerName: "Date",
      field: "createdAt",
      flex: 1,
      cellRenderer: (params: any) => humanDate(params.value),
    },
  ];

  const tableData = isLoading
    ? []
    : data.map((item: any) => ({
        ...item,
        user: `${item.performedBy?.firstName} ${item.performedBy?.lastName}`,
        path: item.path.split("/").splice(2).join(" > "),
        createdAt: item.createdAt,
        payload: item.payload,
      }));

  const skipKeys = ["__v", "_id", "refreshToken", "password"];

  const formatKey = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

  const isMongoId = (value: unknown) =>
    typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

  const shouldSkipField = (key: string, value: unknown) => {
    if (skipKeys.includes(key)) return true;
    if (typeof value === "string" && isMongoId(value)) return true;
    if (Array.isArray(value)) {
      return value.every((item) => isMongoId(item));
    }
    return false;
  };

  const formatValue = (key: string, value: unknown) => {
    if (shouldSkipField(key, value)) return null;
    if (isMongoId(value)) return null;

    if (Array.isArray(value)) {
      const cleanList = value.filter(
        (item) => !isMongoId(item) && typeof item !== "object",
      );

      const cleanedObjects = value
        .filter((item) => typeof item === "object" && item !== null)
        .map((obj) =>
          Object.fromEntries(
            Object.entries(obj as Record<string, unknown>).filter(([k, v]) => !shouldSkipField(k, v)),
          ),
        );

      const finalList = [...cleanList, ...cleanedObjects].filter(Boolean);

      if (finalList.length === 0) return "-";

      return (
        <ul className="list-disc list-inside">
          {finalList.map((item, idx) => (
            <li key={idx}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
          ))}
        </ul>
      );
    }

    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>).filter(
        ([subKey, subVal]) => !shouldSkipField(subKey, subVal),
      );

      const hasImage = Object.keys(value as Record<string, unknown>).some((k) =>
        k.toLowerCase().includes("image"),
      );

      if (entries.length === 0 && !hasImage) return null;

      return (
        <div className="grid grid-cols-1 gap-1 text-sm max-w-md overflow-x-auto">
          {Object.entries(value as Record<string, unknown>).map(([innerKey, innerValue], idx) => {
            if (shouldSkipField(innerKey, innerValue)) return null;

            const isImageField = innerKey.toLowerCase().includes("image");
            if (isImageField && innerValue) {
              const imageUrl = typeof innerValue === "string" ? innerValue : (innerValue as any).url || null;

              if (imageUrl) {
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <span>{formatKey(innerKey)}:</span>
                    <img
                      src={imageUrl}
                      alt={innerKey}
                      className="h-24 w-24 rounded border object-cover"
                    />
                  </div>
                );
              }
            }

            if (typeof innerValue !== "object" || innerValue === null || Array.isArray(innerValue)) {
              let displayValue: any = innerValue;

              if (innerKey.toLowerCase().includes("date")) {
                displayValue = humanDate(innerValue as any);
              } else if (innerKey.toLowerCase().includes("time")) {
                displayValue = humanTime(innerValue as any);
              }

              return (
                <div key={idx} className="flex gap-1 items-start">
                  <span className="whitespace-nowrap">{formatKey(innerKey)}:</span>
                  <span className="break-words">{displayValue ?? "-"}</span>
                </div>
              );
            }

            return null;
          })}
        </div>
      );
    }

    if (key.toLowerCase().includes("date")) return humanDate(value as any);
    if (key.toLowerCase().includes("time")) return humanTime(value as any);

    return value ?? "-";
  };

  return (
    <div className="p-4">
      <YearWiseTable
        data={tableData || []}
        columns={columns}
        dateColumn="createdAt"
        tableHeight={400}
        tableTitle="Logs Table"
        exportData={true}
        search={true}
      />
      <MuiModal open={openModal} onClose={() => setOpenModal(false)} title="View Log">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          {selectedLog &&
            Object.entries(selectedLog).map(([key, value], index) => {
              if (skipKeys.includes(key)) return null;
              const formattedKey = formatKey(key);
              const formattedValue = formatValue(key, value);

              if (!formattedKey || formattedValue === null) return null;

              return <DetalisFormatted key={index} title={formattedKey} detail={formattedValue} />;
            })}
        </div>
      </MuiModal>
    </div>
  );
};

export default LogPage;
