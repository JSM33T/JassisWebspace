"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { adminEmailService } from "@/lib/api/admin-email.service";
import { adminUserService } from "@/lib/api/admin-user.service";
import type { AdminUserListItem } from "@/lib/api/admin-user.types";
import type { EmailTemplate } from "@/lib/api/admin-email.types";
import { extractVariables, isAutoVar, substituteVars } from "@/lib/api/admin-email.types";

type Mode = "test" | "bcc" | "separate";

const ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "mod", label: "Mod" },
    { value: "user", label: "User" },
];

function userDisplayName(u: AdminUserListItem): string {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    return name || u.username;
}

export default function SendEmailPage() {
    const { id } = useParams<{ id: string }>();
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [mode, setMode] = useState<Mode>("test");
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [varValues, setVarValues] = useState<Record<string, string>>({});

    // Test mode — selected registered users
    const [testUsers, setTestUsers] = useState<AdminUserListItem[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [searchResults, setSearchResults] = useState<AdminUserListItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Broadcast filter
    const [selectedRoles, setSelectedRoles] = useState<string[]>(["admin", "mod", "user"]);

    // Opted-out user IDs (cannot be selected as test recipients)
    const [optedOutIds, setOptedOutIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        adminEmailService.getOptedOutUserIds()
            .then(ids => setOptedOutIds(new Set(ids)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        adminEmailService.getTemplate(id)
            .then(t => {
                setTemplate(t);
                const manualVars = t.variables.filter(v => !isAutoVar(v));
                setVarValues(Object.fromEntries(manualVars.map(v => [v, ""])));
            })
            .catch(() => toast.error("Failed to load template."))
            .finally(() => setLoading(false));
    }, [id]);

    const detectedVars = useMemo(
        () => template ? extractVariables(template.subject, template.htmlBody) : [],
        [template]
    );
    const manualVars = useMemo(() => detectedVars.filter(v => !isAutoVar(v)), [detectedVars]);
    const autoVars = useMemo(() => detectedVars.filter(v => isAutoVar(v)), [detectedVars]);

    const previewVars = useMemo(() => {
        const out: Record<string, string> = { ...varValues };
        for (const av of autoVars) out[av] = `[${av}]`;
        return out;
    }, [varValues, autoVars]);

    const previewSubject = useMemo(
        () => template ? substituteVars(template.subject, previewVars) : "",
        [template, previewVars]
    );
    const previewBody = useMemo(
        () => template ? substituteVars(template.htmlBody, previewVars) : "",
        [template, previewVars]
    );

    const searchUsers = useCallback((query: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) { setSearchResults([]); setShowDropdown(false); return; }
        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const results = await adminUserService.getUsers({ search: query, pageSize: 8 });
                setSearchResults(results.filter(u => !testUsers.some(t => t.id === u.id)));
                setShowDropdown(true);
            } catch {
                // silently ignore search errors
            } finally {
                setSearchLoading(false);
            }
        }, 300);
    }, [testUsers]);

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setUserSearch(e.target.value);
        searchUsers(e.target.value);
    }

    function selectUser(user: AdminUserListItem) {
        setTestUsers(prev => [...prev, user]);
        setSearchResults(prev => prev.filter(u => u.id !== user.id));
        setUserSearch("");
        setShowDropdown(false);
        searchRef.current?.focus();
    }

    function removeUser(userId: string) {
        setTestUsers(prev => prev.filter(u => u.id !== userId));
    }

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                searchRef.current && !searchRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    function toggleRole(role: string) {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    }

    async function handleSend() {
        if (!template) return;
        setSending(true);
        setConfirmOpen(false);
        try {
            if (mode === "test") {
                const result = await adminEmailService.testSend(template.id, {
                    variables: varValues,
                    testRecipientUserIds: testUsers.map(u => u.id),
                });
                toast.success(`Test email sent to ${result.recipientCount} recipient(s).`);
            } else {
                const result = await adminEmailService.broadcast(template.id, {
                    variables: varValues,
                    mode,
                    filter: { roles: selectedRoles },
                });
                if (mode === "separate" && result.jobId) {
                    toast.success(`Queued ${result.recipientCount} emails (job ${result.jobId}).`);
                } else {
                    toast.success(`Sent to ${result.recipientCount} recipients.`);
                }
            }
        } catch {
            toast.error("Failed to send.");
        } finally {
            setSending(false);
        }
    }

    const canSend = mode === "test"
        ? testUsers.length > 0
        : selectedRoles.length > 0;

    if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
    if (!template) return <div className="p-6 text-sm text-destructive">Template not found.</div>;

    return (
        <div className="p-6 space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Send — {template.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                {/* Left — controls */}
                <div className="space-y-6">
                    {/* Variable inputs */}
                    {(manualVars.length > 0 || autoVars.length > 0) && (
                        <div className="rounded-lg border p-4 space-y-4">
                            <p className="text-sm font-medium">Template variables</p>
                            {manualVars.map(v => (
                                <div key={v} className="space-y-1.5">
                                    <Label htmlFor={`var-${v}`} className="font-mono text-xs">{`{{${v}}}`}</Label>
                                    <Input
                                        id={`var-${v}`}
                                        value={varValues[v] ?? ""}
                                        onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                                        placeholder={`Value for {{${v}}}`}
                                    />
                                </div>
                            ))}
                            {autoVars.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs text-muted-foreground">Auto-filled per recipient:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {autoVars.map(v => (
                                            <Badge key={v} variant="outline" className="font-mono text-xs text-muted-foreground" title="Resolved automatically from user record">
                                                {`{{${v}}}`} ✦
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mode tabs */}
                    <div className="space-y-3">
                        <div className="flex gap-1 rounded-lg border p-1 bg-muted/40">
                            {(["test", "bcc", "separate"] as Mode[]).map(m => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMode(m)}
                                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                                        mode === m
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {mode === "test" && (
                            <div className="space-y-2">
                                <Label className="text-sm">Test recipients</Label>

                                {/* Selected user chips */}
                                {testUsers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {testUsers.map(u => (
                                            <span
                                                key={u.id}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
                                            >
                                                <span className="font-medium">{userDisplayName(u)}</span>
                                                <span className="text-muted-foreground">{u.email}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeUser(u.id)}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* User search */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        ref={searchRef}
                                        value={userSearch}
                                        onChange={handleSearchChange}
                                        onFocus={() => userSearch && setShowDropdown(true)}
                                        placeholder="Search users by name or email…"
                                        className="pl-8"
                                    />
                                    {showDropdown && (
                                        <div
                                            ref={dropdownRef}
                                            className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
                                        >
                                            {searchLoading ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                                            ) : searchResults.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">No users found.</div>
                                            ) : (
                                                searchResults.map(u => {
                                                    const optedOut = optedOutIds.has(u.id);
                                                    return (
                                                        <button
                                                            key={u.id}
                                                            type="button"
                                                            disabled={optedOut}
                                                            onMouseDown={e => { if (optedOut) return; e.preventDefault(); selectUser(u); }}
                                                            className={`flex w-full items-center gap-3 px-3 py-2 text-sm text-left ${optedOut ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium truncate">{userDisplayName(u)}</div>
                                                                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                {optedOut && (
                                                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                                                        unsubscribed
                                                                    </Badge>
                                                                )}
                                                                {u.roles.length > 0 && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {u.roles[0]}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Subject prefixed with [TEST]. Auto-variables resolved from each user&apos;s profile.
                                </p>
                            </div>
                        )}

                        {(mode === "bcc" || mode === "separate") && (
                            <div className="space-y-2">
                                <Label className="text-sm">Recipient roles</Label>
                                <div className="flex gap-2">
                                    {ROLE_OPTIONS.map(r => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            onClick={() => toggleRole(r.value)}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                selectedRoles.includes(r.value)
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "text-muted-foreground border-border hover:border-foreground"
                                            }`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                                {mode === "separate" && (
                                    <p className="text-xs text-muted-foreground rounded-md border bg-muted/40 p-2">
                                        Each recipient gets a personalised email. Auto-variables resolve per user. Sent via background job.
                                    </p>
                                )}
                                {mode === "bcc" && (
                                    <p className="text-xs text-muted-foreground">
                                        All matching users BCCed on a single email. Auto-variables are not personalised in BCC mode.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={() => mode === "test" ? handleSend() : setConfirmOpen(true)}
                        disabled={!canSend || sending}
                        className="w-full"
                    >
                        {sending
                            ? "Sending…"
                            : mode === "test"
                                ? `Send test${testUsers.length > 0 ? ` to ${testUsers.length} user${testUsers.length > 1 ? "s" : ""}` : ""}`
                                : mode === "bcc"
                                    ? "Send via BCC"
                                    : "Queue broadcast"
                        }
                    </Button>
                </div>

                {/* Right — live preview */}
                <div className="space-y-2">
                    <p className="text-sm font-medium">Preview</p>
                    <div className="rounded-lg border overflow-hidden">
                        <div className="border-b bg-muted/30 px-4 py-2.5">
                            <p className="text-xs text-muted-foreground">Subject</p>
                            <p className="text-sm font-medium mt-0.5">
                                {previewSubject || <span className="italic text-muted-foreground">No subject</span>}
                            </p>
                        </div>
                        <iframe
                            srcDoc={previewBody || "<p style='color:#888;font-family:sans-serif;padding:2rem'>HTML body will appear here…</p>"}
                            sandbox=""
                            className="w-full h-[600px] bg-white"
                            title="Email preview"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Auto-variables shown as <span className="font-mono">[firstName]</span> placeholders in preview. Actual values resolved per recipient when sent.
                    </p>
                </div>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{mode === "bcc" ? "Send via BCC" : "Queue broadcast"}</DialogTitle>
                        <DialogDescription>
                            {mode === "bcc"
                                ? `This will send one email with all matching users BCCed. Roles: ${selectedRoles.join(", ")}.`
                                : `This will queue individual emails for all matching users (roles: ${selectedRoles.join(", ")}). Each will get personalised content via background job.`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={handleSend} disabled={sending}>
                            {sending ? "Sending…" : "Confirm"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
