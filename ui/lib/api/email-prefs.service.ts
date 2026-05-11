import { apiClient } from "./client";

export interface EmailPreferences {
    receiveBroadcastEmails: boolean;
}

export const emailPrefsService = {
    async getPrefs(): Promise<EmailPreferences> {
        return apiClient.get<EmailPreferences>("/account/email-preferences");
    },
    async updatePrefs(data: EmailPreferences): Promise<EmailPreferences> {
        return apiClient.put<EmailPreferences>("/account/email-preferences", data);
    },
};
