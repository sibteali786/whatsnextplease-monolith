"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRequest = exports.getTestServer = void 0;
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../server");
const getTestServer = async () => {
    const app = await (0, server_1.createServer)();
    return app;
};
exports.getTestServer = getTestServer;
const testRequest = (app) => {
    return (0, supertest_1.default)(app);
};
exports.testRequest = testRequest;
