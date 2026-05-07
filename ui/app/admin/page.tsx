"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    BookOpen,
    Image as GalleryIcon,
    Users,
    ArrowRight,
    Mail,
    Music,
    FileText,
    Users2,
    Heart,
    MessageCircle,
    MessageCircleMore,
    Settings,
    SlidersHorizontal,
    Send,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardService } from "@/lib/api/admin-dashboard.service";
import { type AdminDashboardStats } from "@/lib/api/admin-dashboard.types";
import { Spinner } from "@/components/ui/spinner";

export default function AdminPage() {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminDashboardService.getStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-8 p-8 pt-24">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="mt-2 text-muted-foreground">
                    Welcome to the admin dashboard. Manage your content and settings here.
                </p>
            </div>

            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    {loadingStats ? (
                        <div className="col-span-3 flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 p-6">
                            <Spinner className="mr-2 h-4 w-4" />
                            <span>Loading stats...</span>
                        </div>
                    ) : stats ? (
                        <>
                            <Card className="transition-shadow hover:shadow-md">
                                <CardHeader className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Active users</CardTitle>
                                        <Users2 className="h-4 w-4 text-cyan-500" />
                                    </div>
                                    <CardContent className="text-3xl font-bold">{stats.totalUsers}</CardContent>
                                </CardHeader>
                            </Card>
                            <Card className="transition-shadow hover:shadow-md">
                                <CardHeader className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Likes (last 7 days)</CardTitle>
                                        <Heart className="h-4 w-4 text-rose-500" />
                                    </div>
                                    <CardContent className="text-3xl font-bold">{stats.likesLast7Days}</CardContent>
                                </CardHeader>
                            </Card>
                            <Card className="transition-shadow hover:shadow-md">
                                <CardHeader className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Comments (last 7 days)</CardTitle>
                                        <MessageCircle className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <CardContent className="text-3xl font-bold">{stats.commentsLast7Days}</CardContent>
                                </CardHeader>
                            </Card>
                        </>
                    ) : (
                        <div className="col-span-3 rounded-xl border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
                            Unable to load stats.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/blogs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Blog Posts</CardTitle>
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Blogs</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Create, edit, and publish blog articles.
                            </p>
                            <div className="flex items-center text-sm text-emerald-500 transition-transform group-hover:translate-x-1">
                                Go to Blogs <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/content">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Content Library</CardTitle>
                            <FileText className="h-4 w-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Monitor Content</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Track links, comments, and engagement across every asset.
                            </p>
                            <div className="flex items-center text-sm text-sky-500 transition-transform group-hover:translate-x-1">
                                Explore Content <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/gallery">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Gallery</CardTitle>
                            <GalleryIcon className="h-4 w-4 text-pink-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Gallery</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Upload photos and manage albums.
                            </p>
                            <div className="flex items-center text-sm text-pink-700 transition-transform group-hover:translate-x-1">
                                Go to Gallery <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/users">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Users</CardTitle>
                            <Users className="h-4 w-4 text-orange-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Users</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                View and manage user accounts.
                            </p>
                            <div className="flex items-center text-sm text-orange-700 transition-transform group-hover:translate-x-1">
                                Go to Users <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/messages">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Messages</CardTitle>
                            <Mail className="h-4 w-4 text-cyan-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">View Messages</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Review contact form submissions.
                            </p>
                            <div className="flex items-center text-sm text-cyan-500 transition-transform group-hover:translate-x-1">
                                Go to Messages <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/email">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
                            <Send className="h-4 w-4 text-violet-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Send Emails</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Build templates with variables and broadcast to users.
                            </p>
                            <div className="flex items-center text-sm text-violet-500 transition-transform group-hover:translate-x-1">
                                Go to Email <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/music">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Music Tracks</CardTitle>
                            <Music className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Tracks</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Manage DB-backed tracks and playback readiness.
                            </p>
                            <div className="flex items-center text-sm text-emerald-400 transition-transform group-hover:translate-x-1">
                                Go to Music <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/properties">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Properties</CardTitle>
                            <SlidersHorizontal className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage UI Variables</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Seeded and custom backend-driven UI properties for links and other display values.
                            </p>
                            <div className="flex items-center text-sm text-amber-500 transition-transform group-hover:translate-x-1">
                                Open Properties <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="group cursor-pointer transition-shadow hover:shadow-md">
                    <Link href="/admin/settings">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Settings</CardTitle>
                            <Settings className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">System Settings</div>
                            <p className="mb-4 mt-1 text-xs text-muted-foreground">
                                Manage ISR cache tags and future system-level controls.
                            </p>
                            <div className="flex items-center text-sm text-gray-500 transition-transform group-hover:translate-x-1">
                                Open Settings <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            </div>
        </div>
    );
}

