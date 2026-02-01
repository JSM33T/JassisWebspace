"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Shield, Smartphone, Laptop, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { applyCacheBustingParam } from "@/lib/cacheBust";

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
    const [sessions, setSessions] = useState<Session[]>([
        {
            id: '1',
            deviceType: 'Browser',
            deviceName: 'Chrome on Windows',
            lastActive: new Date().toISOString(),
            isCurrent: true,
            ipAddress: '127.0.0.1',
            location: 'Localhost'
        }
    ]);

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
                                    <div key={session.id} className="flex items-center justify-between p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                {session.deviceType === 'Mobile' ? (
                                                    <Smartphone className="h-5 w-5 text-primary" />
                                                ) : (
                                                    <Laptop className="h-5 w-5 text-primary" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium">{session.deviceName} {session.isCurrent && <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full ml-2">Current</span>}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <span>{session.location || 'Unknown Location'}</span>
                                                    <span>•</span>
                                                    <span>{session.ipAddress}</span>
                                                    <span>•</span>
                                                    <span>Last active: {new Date(session.lastActive).toLocaleDateString()}</span>
                                                </p>
                                            </div>
                                        </div>
                                        {!session.isCurrent && (
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <LogOut className="h-4 w-4 mr-2" />
                                                Revoke
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
}
