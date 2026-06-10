import WidgetSection from "../../../components/WidgetSection";
import ClockInOutAttendance from "../../../components/ClockInOutAttendance";
import AttendanceTimeline from "../../../components/AttendanceTimeline";

const Attendance = () => {
  return (
    <div className="flex flex-col gap-6">
      <WidgetSection layout={1} border title="Attendance">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ClockInOutAttendance />
          </div>
          <div className="xl:col-span-1">
            <AttendanceTimeline />
          </div>
        </div>
      </WidgetSection>
    </div>
  );
};

export default Attendance;
