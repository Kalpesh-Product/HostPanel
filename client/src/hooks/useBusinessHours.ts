import useWorkspacePreferences from "./useWorkspacePreferences";

export type BusinessHours = {
  start: string;
  end: string;
  is24Hours: boolean;
  startMinutes: number;
  endMinutes: number;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function useBusinessHours(): BusinessHours {
  const preferences = useWorkspacePreferences();
  const { start, end, is24Hours } = preferences.businessHours;
  return {
    start: is24Hours ? "00:00" : start,
    end: is24Hours ? "23:59" : end,
    is24Hours,
    startMinutes: is24Hours ? 0 : toMinutes(start),
    endMinutes: is24Hours ? 24 * 60 : toMinutes(end),
  };
}
