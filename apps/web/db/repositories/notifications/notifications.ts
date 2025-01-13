"use server";
import {
  CreateNotificationDto,
  ErrorResponse,
  NotificationResponse,
} from "@wnp/types";

export const createNotification = async (
  params: CreateNotificationDto,
): Promise<NotificationResponse | ErrorResponse> => {
  try {
    const response = await fetch(`${process.env.API_URL}/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    console.log(response);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create notification");
    }

    return data;
  } catch (error) {
    console.error("Notification creation failed:", error);
    throw error;
  }
};
