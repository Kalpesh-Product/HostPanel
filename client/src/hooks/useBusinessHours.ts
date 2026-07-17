import { useState, useEffect } from "react";
import useAxiosPrivate from "./useAxiosPrivate";

export type BusinessHours = {
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
};

const DEFAULT: BusinessHours = {
  start: "09:00",
  end: "22:00",
  startMinutes: 9 * 60,
  endMinutes: 22 * 60,
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function useBusinessHours(): BusinessHours {
  const axiosPrivate = useAxiosPrivate();
  const [hours, setHours] = useState<BusinessHours>(DEFAULT);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axiosPrivate.get("/api/workspaces/settings");
        const bh = res?.data?.data?.settings?.preferences?.businessHours;
        if (mounted && bh?.start && bh?.end) {
          setHours({
            start: bh.start,
            end: bh.end,
            startMinutes: toMinutes(bh.start),
            endMinutes: toMinutes(bh.end),
          });
        }
      } catch {
        // keep defaults
      }
    })();
    return () => { mounted = false; };
  }, [axiosPrivate]);

  return hours;
}
