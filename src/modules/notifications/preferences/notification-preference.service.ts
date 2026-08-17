import type { UserProfile } from "@/modules/auth/auth.types";
import { NotificationPreferenceRepository } from "./notification-preference.repository";
import { UpdateNotificationPreferenceSchema } from "./notification-preference.validator";
import type { UpdateNotificationPreferenceDTO } from "./notification-preference.types";

export class NotificationPreferenceService {
    constructor(private repository = new NotificationPreferenceRepository()) { }

    async getMine(user: UserProfile) {
        const preference = await this.repository.findByUserId(user.id);

        return preference ?? {
            user_id: user.id,
            happy_hour_push_enabled: false,
            happy_hour_city: null,
            happy_hour_district: null,
            created_at: null,
            updated_at: null,
        };
    }

    async updateMine(input: UpdateNotificationPreferenceDTO, user: UserProfile) {
        const dto = UpdateNotificationPreferenceSchema.parse(input);

        return this.repository.upsert(user.id, dto);
    }
}
