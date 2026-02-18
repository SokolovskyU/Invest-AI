import { useEffect, useMemo, useState } from "react";
import { NativeApp } from "./NativeApp";

type UiMode = "legacy" | "native";

const MODE_STORAGE_KEY = "invest_ui_mode";
type FeatureFlagsResponse = {
  flags?: {
    native_ui_default?: boolean;
  };
};

function resolveLegacyPath(pathname: string): string {
  const normalized = pathname.toLowerCase();
  const isAnalytics = normalized === "/analytics" || normalized.startsWith("/analytics/");

  if (import.meta.env.DEV) {
    return isAnalytics ? "/legacy-analytics.html" : "/legacy-home.html";
  }

  return isAnalytics ? "/legacy/analytics" : "/legacy";
}

function readInitialMode(): UiMode {
  const searchMode = new URLSearchParams(window.location.search).get("ui");
  if (searchMode === "native" || searchMode === "legacy") {
    return searchMode;
  }

  const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
  if (storedMode === "native" || storedMode === "legacy") {
    return storedMode;
  }

  return "legacy";
}

function hasExplicitModePreference(): boolean {
  const searchMode = new URLSearchParams(window.location.search).get("ui");
  if (searchMode === "native" || searchMode === "legacy") return true;
  const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY);
  return storedMode === "native" || storedMode === "legacy";
}

function writeMode(mode: UiMode): void {
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  const url = new URL(window.location.href);
  url.searchParams.set("ui", mode);
  window.history.replaceState(null, "", url.toString());
}

export function App() {
  const [mode, setMode] = useState<UiMode>(() => readInitialMode());
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const legacyPath = resolveLegacyPath(pathname);
  const title = useMemo(
    () => (mode === "legacy" ? "Legacy (stable)" : "Native React (migration)"),
    [mode]
  );

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (hasExplicitModePreference()) return;
    let cancelled = false;
    fetch("/api/feature-flags", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: FeatureFlagsResponse | null) => {
        if (cancelled) return;
        if (payload?.flags?.native_ui_default) {
          setMode("native");
          writeMode("native");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function applyMode(nextMode: UiMode): void {
    setMode(nextMode);
    writeMode(nextMode);
  }

  function navigate(nextPath: string): void {
    if (!nextPath || nextPath === pathname) return;
    const url = new URL(window.location.href);
    url.pathname = nextPath;
    window.history.pushState(null, "", url.toString());
    setPathname(nextPath);
  }

  return (
    <main className="app-root">
      <header className="mode-bar">
        <strong>UI Mode:</strong>
        <button
          type="button"
          className={mode === "legacy" ? "is-active" : ""}
          onClick={() => applyMode("legacy")}
        >
          Legacy
        </button>
        <button
          type="button"
          className={mode === "native" ? "is-active" : ""}
          onClick={() => applyMode("native")}
        >
          Native
        </button>
        <span className="mode-caption">{title}</span>
      </header>

      {mode === "legacy" ? (
        <section className="legacy-shell">
          <iframe
            key={legacyPath}
            className="legacy-frame"
            data-testid="legacy-frame"
            src={legacyPath}
            title="Legacy UI Replica"
          />
        </section>
      ) : (
        <section className="native-shell">
          <NativeApp pathname={pathname} onNavigate={navigate} />
        </section>
      )}
    </main>
  );
}
