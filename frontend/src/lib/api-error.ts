import { z } from "zod";

/** Error body produced by the gateway's `AllExceptionsFilter`. */
export const apiErrorBodySchema = z.object({
  statusCode: z.number(),
  error: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]),
});

type ApiErrorInit = {
  status: number;
  code: string | null;
  message: string;
};

/** The single error type thrown by the API client. `status` is 0 when the server was unreachable. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor({ status, code, message }: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
