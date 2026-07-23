import useWorkspacePreferences from "./useWorkspacePreferences";

export type BusinessHours = {
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function useBusinessHours(): BusinessHours {
  const preferences = useWorkspacePreferences();
  const { start, end } = preferences.businessHours;
  return {
    start,
    end,
    startMinutes: toMinutes(start),
    endMinutes: toMinutes(end),
  };
}
