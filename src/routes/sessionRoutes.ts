import type { Express, Request, Response } from "express";
import { attachSession, clearSession, hasSessionToken, setSessionToken } from "../auth/session";
import { mapZodIssues, sessionTokenPayloadSchema } from "../validation/payloads";

export function registerSessionRoutes(app: Express): void {
  app.use(attachSession);

  app.get("/api/session", (req: Request, res: Response) => {
    res.json({ ok: true, hasToken: hasSessionToken(req) });
  });

  app.post("/api/session/token", (req: Request, res: Response) => {
    const parsed = sessionTokenPayloadSchema.safeParse(req.body || {});
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: "Invalid payload",
        details: mapZodIssues(parsed.error),
      });
      return;
    }

    setSessionToken(req, res, parsed.data.token);
    res.json({ ok: true });
  });

  app.post("/api/session/logout", (req: Request, res: Response) => {
    clearSession(req, res);
    res.json({ ok: true });
  });
}
