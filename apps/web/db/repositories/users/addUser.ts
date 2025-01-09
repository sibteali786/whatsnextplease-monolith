"use server";
import { addUserSchema } from "@/utils/validationSchemas";
import prisma from "@/db/db";
import "server-only";
import { checkIfUserExists } from "@/utils/authTools";

const addUser = async (formData: FormData) => {
  try {
    // Validate the form data using the schema
    const data = addUserSchema.parse(Object.fromEntries(formData));

    // Check if user already exists and get the hashed password
    const { error, hashedPassword } = await checkIfUserExists({
      email: data.email,
      username: data.username,
      password: data.password,
    });

    if (error) {
      // Return error message to be displayed on the frontend
      return { success: false, message: error.message };
    }

    // Insert the validated data into the database
    const newUser = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: hashedPassword,
        designation: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
      },
    });

    return {
      success: true,
      message: "User created successfully",
      user: newUser,
    };
  } catch (error) {
    console.error("Error adding new user:", error);

    // Return structured error message for frontend display
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again later.",
    };
  }
};

export default addUser;
