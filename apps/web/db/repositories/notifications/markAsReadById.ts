"use server";
import { NotificationMarkAsReadResponse } from "@wnp/types";

export const markAsReadNotification = async (
  id: string,
): Promise<NotificationMarkAsReadResponse> => {
  const response = await fetch(
    `${process.env.API_URL}/notifications/${id}/read`,
    {
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to mark notification as read");
  }

  return response.json();
};
