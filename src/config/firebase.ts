import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

interface FirebaseServiceAccount {
    project_id: string;
    client_email: string;
    private_key: string;
}

let firebaseApp: App | null = null;

export function hasFirebaseCredentials() {
    return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
}

export function getFirebaseApp() {
    if (firebaseApp) {
        return firebaseApp;
    }

    const existingApp = getApps()[0];

    if (existingApp) {
        firebaseApp = existingApp;
        return firebaseApp;
    }

    const serviceAccount = readFirebaseServiceAccount();

    firebaseApp = initializeApp({
        credential: cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
        }),
    });

    return firebaseApp;
}

export function getFirebaseMessaging(): Messaging {
    return getMessaging(getFirebaseApp());
}

export function getFirebaseConfigStatus() {
    if (!hasFirebaseCredentials()) {
        return {
            configured: false,
            project_id: null,
        };
    }

    try {
        const serviceAccount = readFirebaseServiceAccount();

        return {
            configured: true,
            project_id: serviceAccount.project_id,
        };
    } catch {
        return {
            configured: false,
            project_id: null,
        };
    }
}

function readFirebaseServiceAccount(): FirebaseServiceAccount {
    const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!rawValue) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
    }

    const parsedValue = JSON.parse(rawValue) as Partial<FirebaseServiceAccount>;

    if (!parsedValue.project_id || !parsedValue.client_email || !parsedValue.private_key) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is missing required fields");
    }

    return {
        project_id: parsedValue.project_id,
        client_email: parsedValue.client_email,
        private_key: parsedValue.private_key,
    };
}
