export interface AdminUiProperty {
    id: string;
    key: string;
    value: string;
    updatedAt: string;
}

export interface SetUiPropertyRequest {
    value: string;
}
