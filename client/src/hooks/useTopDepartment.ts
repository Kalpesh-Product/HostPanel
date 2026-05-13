// @ts-nocheck
import { useEffect } from "react";
import useAuth from "../hooks/useAuth"; // Adjust the path as necessary

export function useTopDepartment({
  onNotTop,
  additionalTopUserIds = [],
  additionalTopDepartmentIds = [],
} = {}) {
  const { auth } = useAuth();

  const loggedInUserId = auth.user?._id.toString();
  const allowedUserIds = [
    "67b83885daad0f7bab2f184f", // Abrar
    "67b83885daad0f7bab2f1852", // Kashif
    "67b83885daad0f7bab2f1864", // Kalpesh
  ];

  const topUserId = allowedUserIds.find((id) => loggedInUserId === id);

  const currentUserId = auth.user?._id;
  const currentUserName = `${auth.user?.firstName || ""} ${
    auth.user?.lastName || ""
  }`.trim();

  const topUserIds = topUserId
    ? [topUserId, ...additionalTopUserIds]
    : [...additionalTopUserIds];
  const topDepartmentIds = [...additionalTopDepartmentIds];

  // Get all department IDs of current user
  const userDeptIds = auth.user?.departments?.map((d) => d._id) || [];

  // Determine if the user is top-level (either directly or via dept)
  const isTop =
    topUserIds.includes(currentUserId) ||
    userDeptIds.some((deptId) => topDepartmentIds.includes(deptId));

  useEffect(() => {
    if (!isTop && currentUserId && currentUserName) {
      onNotTop?.(currentUserId, currentUserName);
    }
  }, [currentUserId, currentUserName, isTop, onNotTop]);

  return {
    isTop,
    currentUserId,
    currentUserName,
  };
}

