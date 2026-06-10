export const computeOffset = (serverTime: string | Date | number) => {
  return new Date(serverTime).getTime() - Date.now();
};

export const getElapsedSecondsWithOffset = (startTime: string | Date | number, offset: number) => {
  const now = Date.now() + offset;
  const diff = now - new Date(startTime).getTime();
  return Math.max(Math.floor(diff / 1000), 0); // ensure it's not negative
};

export const formatTime12h = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
};

