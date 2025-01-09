"use server";
import { NotificationListResponse } from "@wnp/types/src";

export const fetchNotifications = async (userId: string, role: string) => {
  console.log("response", userId, role);
  const response = await fetch(
    `${process.env.API_URL}/notifications/${userId}?role=${role}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json() as Promise<NotificationListResponse>;
};
