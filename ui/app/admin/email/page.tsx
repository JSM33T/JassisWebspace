"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Send, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { adminEmailService } from "@/lib/api/admin-email.service";
import type { EmailTemplate } from "@/lib/api/admin-email.types";
import { isAutoVar } from "@/lib/api/admin-email.types";

export default function AdminEmailPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        adminEmailService.getTemplates()
            .then(setTemplates)
            .catch(() => toast.error("Failed to load templates."))
            .finally(() => setLoading(false));
    }, []);

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await adminEmailService.deleteTemplate(deleteTarget.id);
            setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
            toast.success("Template deleted.");
        } catch {
            toast.error("Failed to delete template.");
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Email Templates</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create and manage reusable email templates with variable substitution.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/email/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New template
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : templates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No templates yet. Create one to get started.
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Variables</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead className="w-32" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates.map(t => (
                            <TableRow key={t.id}>
                                <TableCell className="font-medium">{t.name}</TableCell>
                                <TableCell className="text-muted-foreground max-w-xs truncate">{t.subject}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {t.variables.slice(0, 4).map(v => (
                                            <Badge
                                                key={v}
                                                variant={isAutoVar(v) ? "outline" : "secondary"}
                                                className="font-mono text-xs"
                                            >
                                                {`{{${v}}}`}
                                            </Badge>
                                        ))}
                                        {t.variables.length > 4 && (
                                            <Badge variant="outline" className="text-xs">+{t.variables.length - 4}</Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {new Date(t.updatedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 justify-end">
                                        <Button variant="ghost" size="icon" asChild title="Send">
                                            <Link href={`/admin/email/${t.id}/send`}>
                                                <Send className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" asChild title="Edit">
                                            <Link href={`/admin/email/${t.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title="Delete"
                                            onClick={() => setDeleteTarget(t)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete template</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Deleting…" : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
