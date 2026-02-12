"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Shield, Smartphone, Laptop, LogOut, Lock, KeyRound, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { authService, SessionInfo } from "@/lib/api/auth.service";
import { ApiError } from "@/lib/api/types";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

function getDeviceName(userAgent: string): string {
    if (userAgent.includes("Windows")) return "Windows PC";
    if (userAgent.includes("Macintosh")) return "Mac";
    if (userAgent.includes("Linux")) return "Linux PC";
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("Android")) return "Android Device";
    return "Unknown Device";
}

function isMobile(userAgent: string): boolean {
    return /Mobile|Android|iPhone/i.test(userAgent);
}

export default function SecurityPage() {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isRevokingAll, setIsRevokingAll] = useState(false);

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const handleRevokeAll = async () => {
        setIsRevokingAll(true);
        try {
            await authService.revokeAllOtherSessions();
            // Refresh sessions list, keeping only current session
            const current = sessions.find(s => s.isCurrentSession);
            if (current) {
                setSessions([current]);
            } else {
                // Fallback to fetch if state is somehow wonky
                const activeSessions = await authService.getActiveSessions();
                setSessions(activeSessions);
            }
            toast.success("All other sessions revoked successfully");
        } catch (error) {
            console.error("Revoke all error:", error);
            toast.error("Failed to revoke other sessions");
        } finally {
            setIsRevokingAll(false);
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const onSubmitPasswordChange = async () => {
        if (!user?.email) {
            toast.error("User email not found");
            return;
        }

        // Check if user logged in via OAuth (Google/GitHub) or Email/Password
        const isOAuthUser = user.authMethod !== "EmailPassword";

        // For OAuth users, current password is not required
        // For Email/Password users, current password is required
        if (!isOAuthUser && !passwordData.currentPassword) {
            toast.error("Current password is required");
            return;
        }

        if (!passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwordData.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }

        setIsLoading(true);
        try {
            await authService.setPassword({
                email: user.email,
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            toast.success("Password updated successfully");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
        } catch (error) {
            console.error("Password change error:", error);
            if (error instanceof ApiError) {
                toast.error(error.message || "Failed to update password");
            } else {
                toast.error("Failed to update password. Please check your current password.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const activeSessions = await authService.getActiveSessions();
                setSessions(activeSessions);
            } catch (error) {
                console.error("Failed to fetch sessions:", error);
                // toast.error("Failed to load active sessions"); // Optional: don't spam toasts on load
            }
        };

        if (user) {
            fetchSessions();
        }
    }, [user]);



    const handleRevokeSession = async (sessionId: string) => {
        try {
            await authService.revokeSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Session revoked successfully");
        } catch (error) {
            console.error("Revoke error:", error);
            toast.error("Failed to revoke session");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-8"
                >
                    {/* Back Navigation */}
                    <motion.div variants={itemVariants}>
                        <Link
                            href="/account/preferences"
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Settings
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div variants={itemVariants} className="space-y-2">
                        <h1 className="text-3xl font-bold">Security</h1>
                        <p className="text-muted-foreground">
                            Manage your active sessions and account security
                        </p>
                    </motion.div>

                    {/* Password Change Section */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Lock className="h-5 w-5 mr-2" />
                                    Change Password
                                </CardTitle>
                                <CardDescription>
                                    {user?.authMethod === "EmailPassword"
                                        ? "Ensure your account is using a long, random password to stay secure."
                                        : "Set a password to enable email/password login for your account."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {user?.authMethod !== "EmailPassword" && (
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            You logged in with {user?.authMethod}. You can set a password to enable email/password login for your account.
                                        </p>
                                    </div>
                                )}
                                {user?.authMethod === "EmailPassword" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Current Password</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="password"
                                                name="currentPassword"
                                                value={passwordData.currentPassword}
                                                onChange={handlePasswordChange}
                                                className="pl-9"
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="password"
                                                name="newPassword"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                className="pl-9"
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="password"
                                                name="confirmPassword"
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordChange}
                                                className="pl-9"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <Button
                                        onClick={onSubmitPasswordChange}
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? (user?.authMethod === "EmailPassword" ? "Updating..." : "Setting...")
                                            : (user?.authMethod === "EmailPassword" ? "Update Password" : "Set Password")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Active Sessions */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Shield className="h-5 w-5 mr-2" />
                                    Active Sessions
                                </CardTitle>
                                <CardDescription>
                                    Manage devices where you're currently logged in
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="font-medium">Session Management</p>
                                        <p className="text-sm text-muted-foreground">
                                            {sessions.length} active session{sessions.length !== 1 && 's'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">View Details</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Active Sessions</DialogTitle>
                                                    <DialogDescription>
                                                        Manage devices where you're currently logged in
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 pt-4">
                                                    {sessions.map((session) => {
                                                        const deviceName = getDeviceName(session.userAgent);
                                                        const mobile = isMobile(session.userAgent);

                                                        return (
                                                            <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm gap-4">
                                                                <div className="flex items-start sm:items-center space-x-4">
                                                                    <div className="p-2 bg-primary/10 rounded-full mt-1 sm:mt-0">
                                                                        {mobile ? (
                                                                            <Smartphone className="h-5 w-5 text-primary" />
                                                                        ) : (
                                                                            <Laptop className="h-5 w-5 text-primary" />
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-medium">{deviceName}</p>
                                                                            {session.isCurrentSession && (
                                                                                <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full ring-1 ring-green-600/20">Current</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                                            <span className="flex items-center gap-1">
                                                                                {session.ipAddress}
                                                                            </span>
                                                                            <span className="hidden sm:inline">•</span>
                                                                            <span className="flex items-center gap-1">
                                                                                Last active: {new Date(session.lastSeenAt).toLocaleDateString()}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {!session.isCurrentSession && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 self-end sm:self-auto"
                                                                        onClick={() => handleRevokeSession(session.id)}
                                                                    >
                                                                        <LogOut className="h-4 w-4 mr-2" />
                                                                        Revoke
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    {sessions.length === 0 && (
                                                        <div className="text-center py-8 text-muted-foreground">
                                                            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                            <p>No active sessions found</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm" disabled={sessions.length <= 1 || isRevokingAll}>
                                                    Revoke All (Except Current)
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will log you out of all other devices except this one. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleRevokeAll} className="bg-destructive hover:bg-destructive/90">
                                                        {isRevokingAll ? "Revoking..." : "Yes, revoke all"}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
}
