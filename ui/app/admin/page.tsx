 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Image as GalleryIcon, Users, ArrowRight, Mail, Music, FileText, Users2, Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDashboardService } from "@/lib/api/admin-dashboard.service";
import { AdminDashboardStats } from "@/lib/api/admin-dashboard.types";
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
        <div className="p-8 pt-24 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-2">
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
                            <Card className="hover:shadow-md transition-shadow">
                                <CardHeader className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Active users</CardTitle>
                                        <Users2 className="h-4 w-4 text-cyan-500" />
                                    </div>
                                    <CardContent className="text-3xl font-bold">{stats.totalUsers}</CardContent>
                                </CardHeader>
                            </Card>
                            <Card className="hover:shadow-md transition-shadow">
                                <CardHeader className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium">Likes (last 7 days)</CardTitle>
                                        <Heart className="h-4 w-4 text-rose-500" />
                                    </div>
                                    <CardContent className="text-3xl font-bold">{stats.likesLast7Days}</CardContent>
                                </CardHeader>
                            </Card>
                            <Card className="hover:shadow-md transition-shadow">
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
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <Link href="/admin/blogs">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Blog Posts
                            </CardTitle>
                            <BookOpen className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Blogs</div>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                Create, edit, and publish blog articles.
                            </p>
                            <div className="flex items-center text-sm text-emerald-500 group-hover:translate-x-1 transition-transform">
                                Go to Blogs <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <Link href="/admin/content">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Content Library
                            </CardTitle>
                            <FileText className="h-4 w-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Monitor Content</div>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                Track links, comments, and engagement across every asset.
                            </p>
                            <div className="flex items-center text-sm text-sky-500 group-hover:translate-x-1 transition-transform">
                                Explore Content <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <Link href="/admin/gallery">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Gallery
                            </CardTitle>
                            <GalleryIcon className="h-4 w-4 text-pink-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Gallery</div>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                Upload photos and manage albums.
                            </p>
                            <div className="flex items-center text-sm text-pink-700 group-hover:translate-x-1 transition-transform">
                                Go to Gallery <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <Link href="/admin/users">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Users
                            </CardTitle>
                            <Users className="h-4 w-4 text-orange-700" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Users</div>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                View and manage user accounts.
                            </p>
                            <div className="flex items-center text-sm text-orange-700 group-hover:translate-x-1 transition-transform">
                                Go to Users <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <Link href="/admin/messages">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Messages
                            </CardTitle>
                            <Mail className="h-4 w-4 text-cyan-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">View Messages</div>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                Review contact form submissions.
                            </p>
                            <div className="flex items-center text-sm text-cyan-500 group-hover:translate-x-1 transition-transform">
                                Go to Messages <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>

                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <Link href="/admin/music">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Music Tracks
                            </CardTitle>
                            <Music className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Manage Tracks</div>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">
                                Manage DB-backed tracks and playback readiness.
                            </p>
                            <div className="flex items-center text-sm text-emerald-400 group-hover:translate-x-1 transition-transform">
                                Go to Music <ArrowRight className="ml-2 h-4 w-4" />
                            </div>
                        </CardContent>
                    </Link>
                </Card>
            </div>
        </div>
    );
}
