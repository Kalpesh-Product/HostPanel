import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setMeetings } from "../../redux/slices/meetingSlice";
import { CircularProgress } from "@mui/material";
import { getStoredUser } from "../../lib/auth-session";

const MeetingLayout = () => {
  const axios = useAxiosPrivate();
  const dispatch = useDispatch();

  // Get workspaceId from stored user (same method as MeetingRoomsPage)
  const user = getStoredUser();
  const workspaceId =
    user?.workspaceMembership?.workspaceId ||
    user?.workspace?.id ||
    user?.workspaceId ||
    user?.workspace?.workspaceId ||
    user?.primaryWorkspace ||
    null;

  const {
    data: meetings = [],
    isPending: isMeetingsPending,
  } = useQuery({
    queryKey: ["meetings", workspaceId],
    queryFn: async () => {
      try {
        if (!workspaceId) {
          return [];
        }
        const response = await axios.get(`/api/meeting-rooms/workspace/${workspaceId}`);
        return response.data?.data?.rooms || response.data || [];
      } catch (error) {
        toast.error("Failed to fetch meetings");
        throw error;
      }
    },
    enabled: !!workspaceId,
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