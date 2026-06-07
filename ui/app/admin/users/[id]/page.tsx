"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Calendar, Key, AlertTriangle, Monitor, Save } from "lucide-react";
import { AdminUserDetail } from "@/lib/api/admin-user.types";
import { adminUserService } from "@/lib/api/admin-user.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [user, setUser] = useState<AdminUserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [isActive, setIsActive] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    const availableRoles = ["user", "mod", "admin"];

    const loadUser = useCallback(async (userId: string) => {
        try {
            const data = await adminUserService.getUser(userId);
            setUser(data);

            // Initialize form state
            setIsActive(data.isActive);
            setEmailVerified(data.emailVerified);
            setSelectedRoles(data.roles);
        } catch (error) {
            console.error("Failed to load user", error);
            // Handle error (maybe redirect or show toast)
        } finally {
            setLoading(false);
        }
    }, []);

    // Re-show the loading state when navigating to a different user.
    const [loadedId, setLoadedId] = useState(id);
    if (id !== loadedId) {
        setLoadedId(id);
        setLoading(true);
    }

    useEffect(() => {
        if (!id) return;
        void (async () => {
            await loadUser(id);
        })();
    }, [id, loadUser]);

    const handleRoleToggle = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            setSaving(true);
            const updatedUser = await adminUserService.updateUser(user.id, {
                isActive,
                emailVerified,
                roles: selectedRoles
            });
            setUser(updatedUser);
            alert("User updated successfully");
        } catch (error) {
            console.error("Failed to update user", error);
            alert("Failed to update user");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;

        try {
            await adminUserService.deleteUser(user.id);
            router.push("/admin/users");
        } catch (error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user");
        }
    };

    if (loading) {
        return (
            <div className="p-8 pt-24 space-y-8 max-w-5xl mx-auto">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <div className="p-8 pt-24 text-center">User not found</div>;
    }

    return (
        <div className="p-8 pt-24 space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/users">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-muted">
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback className="text-xl">
                                {user.firstName?.[0] || user.username[0].toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">{user.displayName || user.username}</h2>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="">@{user.username}</span>
                                <span>•</span>
                                <span className="">{user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {user.isActive ? (
                        <Badge variant="secondary" className="bg-green-500/15 text-green-700">Active</Badge>
                    ) : (
                        <Badge variant="destructive">Inactive</Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Column */}
                <div className="md:col-span-2 space-y-8">

                    {/* Security & Access Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Security & Access
                            </CardTitle>
                            <CardDescription>
                                Manage account status and role-based permissions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Account Status</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Disable to prevent the user from logging in.
                                    </p>
                                </div>
                                <Switch
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Email Verified</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Manually mark email as verified.
                                    </p>
                                </div>
                                <Switch
                                    checked={emailVerified}
                                    onCheckedChange={setEmailVerified}
                                />
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <Label className="text-base">Roles</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {availableRoles.map(role => (
                                        <div key={role} className="flex items-center justify-between border p-3 rounded-lg">
                                            <span className="capitalize font-medium">{role}</span>
                                            <Switch
                                                checked={selectedRoles.includes(role)}
                                                onCheckedChange={() => handleRoleToggle(role)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </CardContent>
                        <CardFooter className="justify-end border-t bg-muted/50 p-4">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">First Name</Label>
                                    <div className="font-medium">{user.firstName || "-"}</div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Last Name</Label>
                                    <div className="font-medium">{user.lastName || "-"}</div>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground">Bio</Label>
                                    <div className="font-medium whitespace-pre-wrap">{user.bio || "-"}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">

                    {/* Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>Joined</span>
                                </div>
                                <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Monitor className="h-4 w-4 text-muted-foreground" />
                                    <span>Active Sessions</span>
                                </div>
                                <span className="font-medium">{user.sessionCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <span>Logins</span>
                                </div>
                                <div className="flex gap-1">
                                    {user.externalLoginProviders.length > 0 ? (
                                        user.externalLoginProviders.map(p => (
                                            <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                                        ))
                                    ) : (
                                        <Badge variant="outline" className="text-xs">Email</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-red-200 dark:border-red-900/50">
                        <CardHeader>
                            <CardTitle className="text-red-600 dark:text-red-500 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Danger Zone
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Deleting a user is permanent and cannot be undone. All their data will be soft-deleted.
                            </p>
                            <Button variant="destructive" className="w-full" onClick={handleDelete}>
                                Delete User
                            </Button>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
