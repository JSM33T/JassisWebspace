import { EmailTemplateForm } from "@/components/admin/email-template-form";

export default function NewEmailTemplatePage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold">New Email Template</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Create a reusable template with <code className="rounded bg-muted px-1">{"{{variable}}"}</code> placeholders.
                </p>
            </div>
            <EmailTemplateForm />
        </div>
    );
}
