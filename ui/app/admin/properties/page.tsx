"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { adminUiPropertiesService } from "@/lib/api/admin-ui-properties.service";
import { type AdminUiProperty } from "@/lib/api/admin-ui-properties.types";

export default function AdminPropertiesPage() {
    const [properties, setProperties] = useState<AdminUiProperty[]>([]);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [creating, setCreating] = useState(false);

    const sortedProperties = useMemo(
        () => [...properties].sort((a, b) => a.key.localeCompare(b.key)),
        [properties]
    );

    const syncDrafts = (items: AdminUiProperty[]) => {
        setDrafts(
            items.reduce<Record<string, string>>((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {})
        );
    };

    const loadProperties = useCallback(async (showRefreshState = false) => {
        try {
            if (showRefreshState) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const data = await adminUiPropertiesService.getProperties();
            setProperties(data);
            syncDrafts(data);
        } catch (error) {
            console.error("Failed to load UI properties", error);
            toast.error("Failed to load properties");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    const handleDraftChange = (key: string, value: string) => {
        setDrafts((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSaveExisting = async (key: string) => {
        const nextValue = drafts[key] ?? "";

        try {
            setSavingKey(key);
            const saved = await adminUiPropertiesService.saveProperty(key, { value: nextValue });

            setProperties((current) =>
                current.map((item) => (item.key === key ? saved : item))
            );
            setDrafts((current) => ({
                ...current,
                [saved.key]: saved.value,
            }));

            toast.success(`${key} updated`);
        } catch (error) {
            console.error(`Failed to update UI property ${key}`, error);
            toast.error(`Failed to update ${key}`);
        } finally {
            setSavingKey(null);
        }
    };

    const handleCreate = async () => {
        const normalizedKey = newKey.trim().toUpperCase();
        const normalizedValue = newValue.trim();

        if (!normalizedKey) {
            toast.error("Property key is required");
            return;
        }

        if (!normalizedValue) {
            toast.error("Property value is required");
            return;
        }

        if (properties.some((item) => item.key.toUpperCase() === normalizedKey)) {
            toast.error("That property key already exists");
            return;
        }

        try {
            setCreating(true);
            const saved = await adminUiPropertiesService.saveProperty(normalizedKey, {
                value: normalizedValue,
            });

            const nextProperties = [...properties, saved].sort((a, b) => a.key.localeCompare(b.key));
            setProperties(nextProperties);
            setDrafts((current) => ({
                ...current,
                [saved.key]: saved.value,
            }));
            setNewKey("");
            setNewValue("");

            toast.success(`${saved.key} created`);
        } catch (error) {
            console.error("Failed to create UI property", error);
            toast.error("Failed to create property");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8 p-8 pt-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Properties</h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage backend-driven UI variables. Properties can be created and updated here, but not deleted.
                    </p>
                </div>
                <Button variant="outline" onClick={() => loadProperties(true)} disabled={refreshing || loading}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Plus className="h-4 w-4" />
                        Add Property
                    </CardTitle>
                    <CardDescription>
                        Create a new UI property using an uppercase key like <code>RESUME_URL</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Key</label>
                            <Input
                                value={newKey}
                                onChange={(event) => setNewKey(event.target.value)}
                                placeholder="RESUME_URL"
                                autoCapitalize="characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Value</label>
                            <Textarea
                                value={newValue}
                                onChange={(event) => setNewValue(event.target.value)}
                                placeholder="https://example.com/resume.pdf"
                                rows={4}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleCreate} disabled={creating}>
                            <Plus className="mr-2 h-4 w-4" />
                            {creating ? "Creating..." : "Create Property"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold">Existing Properties</h2>
                    <p className="text-sm text-muted-foreground">
                        Update values in place. Keys stay stable so frontend references do not break.
                    </p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <Skeleton key={item} className="h-44 w-full rounded-xl" />
                        ))}
                    </div>
                ) : sortedProperties.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-muted-foreground/40 p-8 text-center text-muted-foreground">
                        No UI properties found yet.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {sortedProperties.map((item) => {
                            const draftValue = drafts[item.key] ?? "";
                            const isDirty = draftValue !== item.value;
                            const isSaving = savingKey === item.key;

                            return (
                                <Card key={item.id}>
                                    <CardHeader className="space-y-3">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <Settings2 className="h-4 w-4 text-sky-500" />
                                                    {item.key}
                                                </CardTitle>
                                                <CardDescription>
                                                    Last updated {new Date(item.updatedAt).toLocaleString()}
                                                </CardDescription>
                                            </div>
                                            <Button
                                                onClick={() => handleSaveExisting(item.key)}
                                                disabled={!isDirty || isSaving}
                                            >
                                                <Save className="mr-2 h-4 w-4" />
                                                {isSaving ? "Saving..." : "Save"}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <label className="text-sm font-medium">Value</label>
                                        <Textarea
                                            value={draftValue}
                                            onChange={(event) => handleDraftChange(item.key, event.target.value)}
                                            rows={4}
                                        />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
