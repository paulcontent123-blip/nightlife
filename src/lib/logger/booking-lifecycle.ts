type BookingLifecycleDetails = Record<string, unknown>;

export function logBookingLifecycle(event: string, details: BookingLifecycleDetails = {}) {
    console.info("[booking:lifecycle]", JSON.stringify({
        event,
        at: new Date().toISOString(),
        ...removeUndefinedValues(details),
    }));
}

function removeUndefinedValues(details: BookingLifecycleDetails) {
    return Object.fromEntries(
        Object.entries(details).filter(([, value]) => value !== undefined)
    );
}
