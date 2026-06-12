import type { Classification } from "./decisionTree";

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

const optInKey = "aiActTelemetryOptIn";
const sentKey = "aiActDiagnosisTelemetrySent";

export function hasTelemetryOptIn(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(optInKey) === "true";
}

export function setTelemetryOptIn(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(optInKey, enabled ? "true" : "false");
}

export function trackCompletion(classification: Classification, answeredCount: number): void {
  if (typeof window === "undefined" || !hasTelemetryOptIn()) {
    return;
  }

  const fingerprint = `${classification}:${answeredCount}`;
  if (window.localStorage.getItem(sentKey) === fingerprint) {
    return;
  }

  if (typeof window.plausible === "function") {
    window.plausible("Diagnosis Completed", {
      props: {
        classification,
        answeredCount
      }
    });
  }

  window.localStorage.setItem(sentKey, fingerprint);
}
