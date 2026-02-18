export const FEATURE_FLAG_KEYS = [
  "native_ui_default",
  "session_auth_required",
  "background_analytics_jobs",
  "reports_export_enabled",
  "alerts_enabled",
  "rbac_enabled",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

type FeatureFlagState = Record<FeatureFlagKey, boolean>;

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

const defaultFlags: FeatureFlagState = {
  native_ui_default: parseBoolean(process.env.FEATURE_NATIVE_UI_DEFAULT, false),
  session_auth_required: parseBoolean(process.env.FEATURE_SESSION_AUTH_REQUIRED, false),
  background_analytics_jobs: parseBoolean(process.env.FEATURE_BACKGROUND_ANALYTICS_JOBS, true),
  reports_export_enabled: parseBoolean(process.env.FEATURE_REPORTS_EXPORT_ENABLED, true),
  alerts_enabled: parseBoolean(process.env.FEATURE_ALERTS_ENABLED, true),
  rbac_enabled: parseBoolean(process.env.FEATURE_RBAC_ENABLED, false),
};

const runtimeOverrides: Partial<FeatureFlagState> = {};

export function getFeatureFlags(): FeatureFlagState {
  return {
    ...defaultFlags,
    ...runtimeOverrides,
  };
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return getFeatureFlags()[key];
}

export function setFeatureFlags(overrides: Partial<FeatureFlagState>): FeatureFlagState {
  for (const key of FEATURE_FLAG_KEYS) {
    if (typeof overrides[key] === "boolean") {
      runtimeOverrides[key] = overrides[key];
    }
  }
  return getFeatureFlags();
}

export function resetFeatureFlags(): FeatureFlagState {
  for (const key of FEATURE_FLAG_KEYS) {
    delete runtimeOverrides[key];
  }
  return getFeatureFlags();
}
