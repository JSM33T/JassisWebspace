"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { EmailTemplateForm } from "@/components/admin/email-template-form";
import { adminEmailService } from "@/lib/api/admin-email.service";
import type { EmailTemplate } from "@/lib/api/admin-email.types";

export default function EditEmailTemplatePage() {
    const { id } = useParams<{ id: string }>();
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminEmailService.getTemplate(id)
            .then(setTemplate)
            .catch(() => toast.error("Failed to load template."))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
    }

    if (!template) {
        return <div className="p-6 text-sm text-destructive">Template not found.</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold">Edit Template</h1>
                <p className="text-sm text-muted-foreground mt-1">{template.name}</p>
            </div>
            <EmailTemplateForm template={template} />
        </div>
    );
}
