/*
 * @jest-environment node
 */
import { prismaMock } from "@/singleton";
import addClient from "../addClient";
import { AddClientResponseSchema } from "@/utils/validationSchemas";
import { checkIfClientExists } from "@/utils/authTools";
import { randomUUID } from "crypto";
import { strongPassword } from "@/mocks/commonMocks";
import logger from "@/utils/logger";
import { EntityAlreadyExistsError } from "@/errors/entityAlreadyExists";
import { internalServerErrorMessage } from "@/errors/internalServerError";
import { Roles } from "@prisma/client";

jest.mock("../../../../utils/authTools", () => ({
  __esModule: true,
  checkIfClientExists: jest.fn(),
}));
// Mock revalidateTag
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));
describe("addClient", () => {
  const mockCreate = prismaMock.client.create as jest.Mock;
  const mockCheckIfClientExists = checkIfClientExists as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validFormData = new FormData();
  validFormData.append("username", "mikeSh123");
  validFormData.append("companyName", "Notion");
  validFormData.append("contactName", "Oliva");
  validFormData.append("email", "oliva@notion.com");
  validFormData.append("phone", "+15550000000");
  validFormData.append("passwordHash", strongPassword);
  validFormData.append("website", "https://notion.com");
  validFormData.append("address1", "804 Mahalia Divide");
  validFormData.append("address2", "South Charlotte, AZ 09568");
  validFormData.append("city", "Chicago");
  validFormData.append("state", "IL");
  validFormData.append("zipCode", "23000");

  it("should create a new client when provided with valid data", async () => {
    const hashedPassword = "hashedpassword";

    mockCheckIfClientExists.mockResolvedValue(hashedPassword);

    const mockNewClient = {
      id: randomUUID(),
      username: "mikeSh123",
      companyName: "Notion",
      contactName: "Oliva",
      email: "oliva@notion.com",
      passwordHash: strongPassword,
      phone: "+15550000000",
      website: "https://notion.com",
      address1: "804 Mahalia Divide",
      address2: "South Charlotte, AZ 09568",
      city: "Chicago",
      state: "IL",
      zipCode: "23000",
      role: {
        name: Roles.CLIENT,
      },
    };

    mockCreate.mockResolvedValue(mockNewClient);

    const result = await addClient(validFormData);
    // Validate response against schema
    const parsedResult = AddClientResponseSchema.parse(result);

    expect(parsedResult.success).toBe(true);
    expect(parsedResult.client).toEqual(mockNewClient);

    expect(mockCheckIfClientExists).toHaveBeenCalledWith({
      email: "oliva@notion.com",
      companyName: "Notion",
      password: strongPassword,
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        companyName: "Notion",
        contactName: "Oliva",
        username: "mikeSh123",
        email: "oliva@notion.com",
        phone: "+15550000000",
        website: "https://notion.com",
        address1: "804 Mahalia Divide",
        address2: "South Charlotte, AZ 09568",
        city: "Chicago",
        state: "IL",
        zipCode: "23000",
        passwordHash: hashedPassword,
        role: { connect: { name: Roles.CLIENT } }, // Verify the Client role is connected
      },
      select: expect.any(Object),
    });
  });

  it("should return an error if client already exists", async () => {
    const errorMessage = "Entity already exists";
    mockCheckIfClientExists.mockRejectedValue(
      new EntityAlreadyExistsError(errorMessage),
    );
    const result = await addClient(validFormData);
    logger.debug(result, "Data");
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("ENTITY_ALREADY_EXISTS");
    expect(result.message).toBe("Entity already exists");

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should return a validation error if validation fails", async () => {
    const invalidFormData = new FormData();
    invalidFormData.append("companyName", "No"); // Too short
    invalidFormData.append("password", "123"); // Too short

    const result = await addClient(invalidFormData);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("Validation failed.");
    expect(result.details).toBeDefined();

    expect(mockCheckIfClientExists).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    const hashedPassword = "hashedpassword";

    mockCheckIfClientExists.mockResolvedValue({ error: null, hashedPassword });

    const errorMessage = "Database error";

    mockCreate.mockRejectedValue(new Error(errorMessage));

    const result = await addClient(validFormData);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("INTERNAL_SERVER_ERROR");
    expect(result.message).toBe(internalServerErrorMessage);
    expect(result.details).toBeDefined();
  });
});
