# Implementation Backlog (10 Items)

Date: 2026-02-15

- [x] 1. Portfolio history layer (daily snapshots + timeline events)  
     Files: `src/platform/history.ts`, `src/middleware/historyCapture.ts`, `src/routes/platformRoutes.ts`
- [x] 2. Alerting engine (rules + notifications)  
     Files: `src/platform/alerts.ts`, `src/routes/platformRoutes.ts`
- [x] 3. OpenAPI contract + frontend SDK generation  
     Files: `docs/openapi.yaml`, `web/src/api/generated.ts`, `package.json`
- [x] 4. RBAC and multi-user mode  
     Files: `src/platform/rbac.ts`, `src/routes.ts`, `src/routes/platformRoutes.ts`
- [x] 5. Background jobs for heavy analytics  
     Files: `src/platform/jobs.ts`, `src/routes/platformRoutes.ts`
- [x] 6. Observability: SLO API + Grafana template  
     Files: `src/routes/platformRoutes.ts`, `docs/grafana-slo-dashboard.json`
- [x] 7. Feature flags + staged rollout points  
     Files: `src/platform/featureFlags.ts`, `src/routes/platformRoutes.ts`, `web/src/App.tsx`, `.env.example`
- [x] 8. Report export (JSON/XLSX/PDF)  
     Files: `src/platform/reports.ts`, `src/routes/platformRoutes.ts`
- [x] 9. PWA mode (manifest + service worker + registration)  
     Files: `web/public/manifest.webmanifest`, `web/public/sw.js`, `web/public/offline.html`, `web/src/main.tsx`, `web/index.html`
- [x] 10. Lint/format gate in CI  
      Files: `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `package.json`, `.github/workflows/ci.yml`

## Validation Checklist

- `npm audit --omit=dev` -> expected clean (0 vulnerabilities)
- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run test:runtime`
- `npm run test:vitest`
- `npm run web:build`
