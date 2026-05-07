"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { adminEmailService } from "@/lib/api/admin-email.service";
import type { EmailTemplate } from "@/lib/api/admin-email.types";
import { extractVariables, isAutoVar } from "@/lib/api/admin-email.types";

interface EmailTemplateFormProps {
    template?: EmailTemplate;
}

export function EmailTemplateForm({ template }: EmailTemplateFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(template?.name ?? "");
    const [subject, setSubject] = useState(template?.subject ?? "");
    const [htmlBody, setHtmlBody] = useState(template?.htmlBody ?? "");
    const [textBody, setTextBody] = useState(template?.textBody ?? "");
    const [showTextBody, setShowTextBody] = useState(!!template?.textBody);

    const detectedVars = extractVariables(subject, htmlBody);
    const manualVars = detectedVars.filter(v => !isAutoVar(v));
    const autoVars = detectedVars.filter(v => isAutoVar(v));

    async function handleSave() {
        if (!name.trim()) { toast.error("Name is required."); return; }
        if (!subject.trim()) { toast.error("Subject is required."); return; }
        if (!htmlBody.trim()) { toast.error("HTML body is required."); return; }

        setSaving(true);
        try {
            const data = {
                name: name.trim(),
                subject: subject.trim(),
                htmlBody,
                textBody: textBody.trim() || undefined,
            };

            if (template) {
                await adminEmailService.updateTemplate(template.id, data);
                toast.success("Template updated.");
            } else {
                await adminEmailService.createTemplate(data);
                toast.success("Template created.");
            }
            router.push("/admin/email");
            router.refresh();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Save failed.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="space-y-2">
                <Label htmlFor="name">Template name</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Monthly Newsletter"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                    id="subject"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Hey {{firstName}}, here's what's new"
                />
                {detectedVars.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {manualVars.map(v => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">
                                {`{{${v}}}`}
                            </Badge>
                        ))}
                        {autoVars.map(v => (
                            <Badge key={v} variant="outline" className="font-mono text-xs text-muted-foreground" title="Auto-filled per recipient">
                                {`{{${v}}}`} ✦
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="htmlBody">HTML body</Label>
                <Textarea
                    id="htmlBody"
                    value={htmlBody}
                    onChange={e => setHtmlBody(e.target.value)}
                    placeholder={"<!DOCTYPE html>\n<html>...</html>"}
                    className="min-h-96 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    Use <code className="rounded bg-muted px-1">{"{{variableName}}"}</code> for placeholders.
                    Auto-filled per recipient: <code className="rounded bg-muted px-1">firstName lastName username email displayName</code>
                </p>
            </div>

            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowTextBody(v => !v)}
                    className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                >
                    {showTextBody ? "Hide" : "Add"} plain-text fallback (optional)
                </button>
                {showTextBody && (
                    <Textarea
                        id="textBody"
                        value={textBody}
                        onChange={e => setTextBody(e.target.value)}
                        placeholder="Plain text version..."
                        className="min-h-40 font-mono text-sm"
                    />
                )}
            </div>

            <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : template ? "Save changes" : "Create template"}
                </Button>
                <Button variant="ghost" onClick={() => router.back()} disabled={saving}>
                    Cancel
                </Button>
            </div>
        </div>
    );
}
