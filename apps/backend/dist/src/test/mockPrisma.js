"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaMock = void 0;
const jest_mock_extended_1 = require("jest-mock-extended");
exports.prismaMock = (0, jest_mock_extended_1.mockDeep)();
jest.mock("../config/db", () => ({
    __esModule: true,
    default: exports.prismaMock,
}));
beforeEach(() => {
    (0, jest_mock_extended_1.mockReset)(exports.prismaMock);
});
