import { getFirebaseConfigStatus } from "@/config/firebase";
import { failure, success } from "@/modules/auth/auth.response";

export async function GET() {
    try {
        return success({
            provider: "firebase_cloud_messaging",
            ...getFirebaseConfigStatus(),
        });
    } catch (error) {
        return failure(error);
    }
}
