export interface AdminContactMessage {
    id: string;
    name: string;
    email: string;
    purpose: string;
    message: string;
    refUrl: string | null;
    createdAt: string;
}

export interface AdminContactListParams {
    search?: string;
    page?: number;
    pageSize?: number;
}
