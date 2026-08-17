export const RATE_LIMIT = {
    BOOKING: {
        limit: 10,
        window: 60,
    },

    FORUM_POST: {
        limit: 5,
        window: 3600,
    },

    PUBLIC_API: {
        limit: 100,
        window: 60,
    },

    UPLOAD_AVATAR: {
        limit: 20,
        window: 60,
    },

    AUTH_LOGIN: {
        limit: 5,
        window: 300,
    },

    AUTH_REGISTER: {
        limit: 3,
        window: 3600,
    },

    GOOGLE_LOGIN: {
        limit: 10,
        window: 300,
    },

    AVATAR_UPLOAD: {
        limit: 20,
        window: 60,
    }
} as const;
