export const AUTH_STATE_CHANGED_EVENT = "nightlife:auth-state-changed";

export function notifyAuthStateChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
    }
}
