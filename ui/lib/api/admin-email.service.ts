import { get, post, put, del } from "./client";
import type {
    EmailTemplate,
    CreateEmailTemplateRequest,
    UpdateEmailTemplateRequest,
    TestEmailRequest,
    BroadcastEmailRequest,
    EmailSendResult,
} from "./admin-email.types";

class AdminEmailService {
    async getTemplates(): Promise<EmailTemplate[]> {
        return get<EmailTemplate[]>("/admin/email/templates");
    }

    async getTemplate(id: string): Promise<EmailTemplate> {
        return get<EmailTemplate>(`/admin/email/templates/${id}`);
    }

    async createTemplate(data: CreateEmailTemplateRequest): Promise<EmailTemplate> {
        return post<EmailTemplate, CreateEmailTemplateRequest>("/admin/email/templates", data);
    }

    async updateTemplate(id: string, data: UpdateEmailTemplateRequest): Promise<EmailTemplate> {
        return put<EmailTemplate, UpdateEmailTemplateRequest>(`/admin/email/templates/${id}`, data);
    }

    async deleteTemplate(id: string): Promise<void> {
        return del<void>(`/admin/email/templates/${id}`);
    }

    async testSend(id: string, req: TestEmailRequest): Promise<EmailSendResult> {
        return post<EmailSendResult, TestEmailRequest>(`/admin/email/templates/${id}/test`, req);
    }

    async broadcast(id: string, req: BroadcastEmailRequest): Promise<EmailSendResult> {
        return post<EmailSendResult, BroadcastEmailRequest>(`/admin/email/templates/${id}/broadcast`, req);
    }
}

export const adminEmailService = new AdminEmailService();
