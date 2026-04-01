import { get } from "./client";
import { UiProperty } from "./ui-properties.types";

class UiPropertiesService {
    async getProperty(key: string): Promise<UiProperty> {
        return get<UiProperty>(`/ui-properties/${encodeURIComponent(key)}`);
    }
}

export const uiPropertiesService = new UiPropertiesService();
