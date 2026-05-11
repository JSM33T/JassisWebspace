export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    variables: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateEmailTemplateRequest {
    name: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
}

export interface UpdateEmailTemplateRequest {
    name: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
}

export interface TestEmailRequest {
    variables: Record<string, string>;
    testRecipientUserIds: string[];
}

export interface BroadcastRecipientFilter {
    roles?: string[];
    userIds?: string[];
}

export interface BroadcastEmailRequest {
    variables: Record<string, string>;
    mode: "bcc" | "separate";
    filter: BroadcastRecipientFilter;
}

export interface EmailSendResult {
    status: string;
    recipientCount: number;
    jobId?: string;
    errorMessage?: string;
}

// Variables auto-resolved per recipient in Separate mode
export const AUTO_VARS = ["firstName", "lastName", "username", "email", "displayName"] as const;
export type AutoVar = typeof AUTO_VARS[number];

export function isAutoVar(v: string): boolean {
    return (AUTO_VARS as readonly string[]).includes(v.trim());
}

export function extractVariables(subject: string, htmlBody: string): string[] {
    const matches = (subject + " " + htmlBody).matchAll(/\{\{([^}]+)\}\}|\[([A-Za-z][A-Za-z0-9_]*)\]/g);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const m of matches) {
        const name = (m[1] ?? m[2]).trim();
        const key = name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(name);
        }
    }
    return result;
}

export function substituteVars(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{([^}]+)\}\}|\[([A-Za-z][A-Za-z0-9_]*)\]/g, (token, braceName, bracketName) => {
        const name = braceName ?? bracketName;
        const key = name.trim();
        return vars[key] ?? vars[key.toLowerCase()] ?? token;
    });
}
