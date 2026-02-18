import { z } from "zod";

export const accountsPayloadSchema = z
  .object({
    token: z.string().trim().min(1).max(4096).optional(),
  })
  .passthrough();

export const accountScopedPayloadSchema = z
  .object({
    token: z.string().trim().min(1).max(4096).optional(),
    accountId: z.string().trim().min(1).max(256),
  })
  .passthrough();

export const sessionTokenPayloadSchema = z
  .object({
    token: z.string().trim().min(1).max(4096),
  })
  .passthrough();

export const healthResponseSchema = z.object({
  ok: z.boolean(),
});

export const metricsResponseSchema = z.object({
  uptimeSec: z.number().int().nonnegative(),
  totalRequests: z.number().int().nonnegative(),
  byStatus: z.record(z.string(), z.number().int().nonnegative()),
  byRoute: z.record(z.string(), z.number().int().nonnegative()),
});

export type AccountsPayload = z.infer<typeof accountsPayloadSchema>;
export type AccountScopedPayload = z.infer<typeof accountScopedPayloadSchema>;

export function mapZodIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "body",
    message: issue.message,
  }));
}
