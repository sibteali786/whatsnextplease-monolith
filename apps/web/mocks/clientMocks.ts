import { randomUUID } from "crypto";

export const invalidIds = [null, undefined, "", 123, {}, [], true];
export const mockClientId = randomUUID();
export const pageSize = 10;
export const nullCursor = null;
export const mockInvalidPageSizes = [0, -1, NaN];
