import { get, put } from "./client";
import { AdminUiProperty, SetUiPropertyRequest } from "./admin-ui-properties.types";

class AdminUiPropertiesService {
    async getProperties(): Promise<AdminUiProperty[]> {
        return get<AdminUiProperty[]>("/ui-properties");
    }

    async saveProperty(key: string, request: SetUiPropertyRequest): Promise<AdminUiProperty> {
        return put<AdminUiProperty, SetUiPropertyRequest>(`/ui-properties/${encodeURIComponent(key)}`, request);
    }
}

export const adminUiPropertiesService = new AdminUiPropertiesService();
