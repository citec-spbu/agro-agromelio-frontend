export const SHELL_EVENT_TARGET = "agro:shell";
export const MF_EVENT_TARGET = "agro:mf";

export const ShellToMfEvent = {
  CONTEXT: "agro:shell:context",
};

export const MfToShellEvent = {
  READY: "agro:mf:ready",
  ERROR: "agro:mf:error",
  NAVIGATE: "agro:mf:navigate",
};

export function buildShellContextPayload({
  mfId,
  apiBase,
  authorization,
  dark,
  route,
  version,
  featureFlags,
}) {
  return {
    target: MF_EVENT_TARGET,
    type: ShellToMfEvent.CONTEXT,
    mfId,
    timestamp: Date.now(),
    payload: {
      apiBase: apiBase || "",
      authorization: authorization || "",
      dark: Boolean(dark),
      route: route || "",
      version: version || "",
      featureFlags: featureFlags || {},
    },
  };
}

export function isMfTargetEvent(event, mfId) {
  const detail = event?.detail;
  return Boolean(
    detail &&
      detail.target === MF_EVENT_TARGET &&
      detail.mfId === mfId &&
      typeof detail.type === "string"
  );
}

export function isShellTargetEvent(event, mfId) {
  const detail = event?.detail;
  return Boolean(
    detail &&
      detail.target === SHELL_EVENT_TARGET &&
      detail.mfId === mfId &&
      typeof detail.type === "string"
  );
}
