export type EmergencyStopState = Readonly<{
  stopped: boolean;
  reason: string | null;
  activatedAt: string | null;
}>;

type EmergencyStopGlobalState = typeof globalThis & { __kazEmergencyStopState?: EmergencyStopState };

const globalState = globalThis as EmergencyStopGlobalState;
globalState.__kazEmergencyStopState ??= Object.freeze({ stopped: false, reason: null, activatedAt: null });

export function getEmergencyStopState(): EmergencyStopState {
  return globalState.__kazEmergencyStopState!;
}

export function isEmergencyStopped(): boolean {
  return getEmergencyStopState().stopped;
}

export function activateEmergencyStop(reason = "EMERGENCY_STOP_REQUESTED"): EmergencyStopState {
  globalState.__kazEmergencyStopState = Object.freeze({ stopped: true, reason: reason.trim() || "EMERGENCY_STOP_REQUESTED", activatedAt: new Date().toISOString() });
  return getEmergencyStopState();
}

export function resetEmergencyStopForTests(): void {
  globalState.__kazEmergencyStopState = Object.freeze({ stopped: false, reason: null, activatedAt: null });
}
