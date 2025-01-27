/*
 * @jest-environment node
 */
 
import { prismaMock } from "@/singleton";
import { searchTasks } from "../searchTasks";

describe("searchTasks", () => {
  let mockTaskList: jest.Mock;

  beforeAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockTaskList = prismaMock.task.findMany;
  });

  it("returns error if input param is invalid", async () => {
    const searchTerm = 123;
    const result = await searchTasks(searchTerm as any);
    expect(result?.success).toBe(false);
    expect(result?.errorCode).toBe("VALIDATION_ERROR");
    expect(result.statusCode).toBe(400);
  });

  it("should return no error if searchTerm is valid", async () => {
    const searchTerm = "Programming";
    mockTaskList.mockResolvedValue([]);
    const result = await searchTasks(searchTerm);
    expect.assertions(2);
    expect(result.success).toBe(true);
    expect(result.tasks).toEqual([]);
  });
});
