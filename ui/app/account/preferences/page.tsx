"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useEffect, useState } from "react";

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

export default function PreferencesPage() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSaveSettings = () => {
        toast.success("Settings saved successfully!");
    };

    if (!mounted) {
        return null;
    }

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
                            href="/account/profile"
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Profile
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div variants={itemVariants} className="space-y-2">
                        <h1 className="text-3xl font-bold">Settings</h1>
                        <p className="text-muted-foreground">
                            Manage your account preferences and privacy settings
                        </p>
                    </motion.div>

                    {/* General Settings */}
                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <SettingsIcon className="h-5 w-5 mr-2" />
                                    General Settings
                                </CardTitle>
                                <CardDescription>
                                    Basic preferences for your account
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-medium">Theme</label>
                                        <p className="text-xs text-muted-foreground">Choose between light and dark mode</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm capitalize">{theme === 'system' ? 'System' : theme}</span>
                                        <Switch
                                            checked={theme === 'dark'}
                                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Save Button */}
                    <motion.div variants={itemVariants}>
                        <div className="flex justify-end space-x-4">
                            <Button variant="outline" onClick={() => window.history.back()}>
                                Cancel
                            </Button>
                            <Button onClick={handleSaveSettings}>
                                Save Changes
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
