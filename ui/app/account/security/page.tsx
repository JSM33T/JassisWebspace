"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, Shield, Smartphone, Laptop, LogOut, Lock, KeyRound, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { authService } from "@/lib/api/auth.service";
import { ApiError } from "@/lib/api/types";

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

interface Session {
    id: string;
    deviceType: string;
    deviceName: string;
    lastActive: string;
    isCurrent: boolean;
    ipAddress?: string;
    location?: string;
}

export default function SecurityPage() {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [sessions, setSessions] = useState<Session[]>([
        {
            id: '1',
            deviceType: 'Browser',
            deviceName: 'Chrome on Windows',
            lastActive: new Date().toISOString(),
            isCurrent: true,
            ipAddress: '127.0.0.1',
            location: 'Localhost'
        },
        {
            id: '2',
            deviceType: 'Mobile',
            deviceName: 'Safari on iPhone',
            lastActive: new Date(Date.now() - 86400000).toISOString(),
            isCurrent: false,
            ipAddress: '192.168.1.5',
            location: 'New York, USA'
        }
    ]);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const onSubmitPasswordChange = async () => {
        if (!user?.email) {
            toast.error("User email not found");
            return;
        }

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
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

    const handleRevokeSession = async (sessionId: string) => {
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success("Session revoked successfully");
        } catch (error) {
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
                                    Ensure your account is using a long, random password to stay secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                        {isLoading ? "Updating..." : "Update Password"}
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
                                {sessions.map((session) => (
                                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm gap-4 transition-all hover:bg-muted/50">
                                        <div className="flex items-start sm:items-center space-x-4">
                                            <div className="p-2 bg-primary/10 rounded-full mt-1 sm:mt-0">
                                                {session.deviceType === 'Mobile' ? (
                                                    <Smartphone className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Laptop className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{session.deviceName}</p>
                                                    {session.isCurrent && (
                                                        <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full ring-1 ring-green-600/20">Current</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        {session.location || 'Unknown Location'}
                                                    </span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span>{session.ipAddress}</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="flex items-center gap-1">
                                                        Last active: {new Date(session.lastActive).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {!session.isCurrent && (
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
                                ))}

                                {sessions.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p>No active sessions found</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
}
