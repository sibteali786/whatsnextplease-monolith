"use server";
import {
  AddClientResponse,
  AddClientResponseSchema,
  CreateClientSchema,
} from "@/utils/validationSchemas";
import prisma from "@/db/db";
import "server-only";
import logger from "@/utils/logger";
import { handleError } from "@/utils/errorHandler";
import { checkIfClientExists } from "@/utils/authTools";
import { revalidateTag } from "next/cache";
import { Roles } from "@prisma/client";

export const addClient = async (
  formData: FormData,
): Promise<AddClientResponse> => {
  try {
    // Extract data from formData
    const data = Object.fromEntries(formData);
    // Validate the form data using the schema
    const validatedData = CreateClientSchema.parse(data);
    // Check if client already exists and get the hashed password
    const hashedPassword = await checkIfClientExists({
      email: validatedData.email,
      companyName: validatedData.companyName,
      password: validatedData.passwordHash,
    });

    // Insert the validated data into the database
    const newClient = await prisma.client.create({
      data: {
        username: validatedData.username,
        companyName: validatedData.companyName,
        contactName: validatedData.contactName,
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        address1: validatedData.address1,
        address2: validatedData.address2,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode,
        passwordHash: hashedPassword,
        role: { connect: { name: Roles.CLIENT } },
      },
      select: {
        id: true,
        username: true,
        companyName: true,
        contactName: true,
        passwordHash: true,
        email: true,
        phone: true,
        website: true,
        address1: true,
        address2: true,
        city: true,
        state: true,
        zipCode: true,
        role: { select: { name: true } },
      },
    });

    const responseData = {
      success: true,
      client: newClient,
    };
    revalidateTag("clients:list");
    // Validate the response data against the schema
    return AddClientResponseSchema.parse(responseData);
  } catch (error) {
    logger.error(error, "Error adding new client.");
    return handleError(error, "addClient") as AddClientResponse;
  }
};

export default addClient;
