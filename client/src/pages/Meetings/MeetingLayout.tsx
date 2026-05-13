import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setMeetings } from "../../redux/slices/meetingSlice";
import { CircularProgress } from "@mui/material";

const MeetingLayout = () => {
  const axios = useAxiosPrivate();
  const dispatch = useDispatch();

  const {
    data: meetings = [],
    isPending: isMeetingsPending,
  } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      try {
        const response = await axios.get("/api/meetings/get-meetings");
        return response.data;
      } catch (error) {
        toast.error("Failed to fetch meetings");
        throw error;
      }
    },
  });

  useEffect(() => {
    if (meetings.length > 0) {
      dispatch(setMeetings(meetings));
    }
  }, [meetings, dispatch]);

  return (
    <div>
      {isMeetingsPending ? (
        <div className="h-screen flex justify-center items-center">
          <CircularProgress color="inherit" />
        </div>
      ) : (
        <Outlet />
      )}
    </div>
  );
};

export default MeetingLayout;