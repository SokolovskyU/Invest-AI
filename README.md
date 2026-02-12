# T-Bank Invest API pet project

## Quick start (web)
1. Install deps:
   ```powershell
   npm install
   ```
   If PowerShell blocks `npm.ps1`, use one of these:
   ```powershell
   # Option A (current session only)
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   npm install
   ```
   ```powershell
   # Option B (no policy change)
   & "C:\Program Files\nodejs\npm.cmd" install
   ```
2. Create `.env` based on `.env.example` and set `TINVEST_TOKEN`.
3. Run:
   ```powershell
   npm run dev
   ```
4. Open `http://localhost:3000` and открой страницу **в браузере**.

## Quick start (CLI)
```powershell
npm run cli
```

If you want sandbox, set `TINVEST_ENDPOINT=sandbox-invest-public-api.tbank.ru:443`.

If you see `self-signed certificate in certificate chain`, your network is intercepting TLS.
For local dev only, set `TINVEST_INSECURE=true` in `.env` to disable TLS verification for gRPC.

## Naming policy (important)
- Always display human-readable instrument names (not codes like `TCS00A...`).
- If a name is missing, fetch it via Instruments API and cache it.
- If API rate limits prevent fetching, show a placeholder and retry later, but never revert to showing raw codes as the main label.
