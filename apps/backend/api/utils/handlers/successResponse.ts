import { Response } from 'express';

interface SuccessResponseData<T = unknown> {
  message: string;
  data?: T;
}

/**
 * Standardized success response handler
 */
export class SuccessResponse {
  /**
   * Send a 200 OK response
   */
  static ok<T = unknown>(res: Response, payload: SuccessResponseData<T>): Response {
    return res.status(200).json({
      success: true,
      message: payload.message,
      data: payload.data,
    });
  }

  /**
   * Send a 201 Created response
   */
  static created<T = unknown>(res: Response, payload: SuccessResponseData<T>): Response {
    return res.status(201).json({
      success: true,
      message: payload.message,
      data: payload.data,
    });
  }

  /**
   * Send a 204 No Content response
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send a custom success response with specified status code
   */
  static custom<T = unknown>(
    res: Response,
    statusCode: number,
    payload: SuccessResponseData<T>
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message: payload.message,
      data: payload.data,
    });
  }
}
