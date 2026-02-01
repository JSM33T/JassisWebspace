"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera, User, Mail, Calendar, Shield, Edit, Save, X, Clock, Globe } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import profileService, { ProfileInfo, UpdateProfileRequest } from "@/lib/api/profile.service";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
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

export default function ProfilePage() {
    const { user, setUser } = useUser();
    const [profile, setProfile] = useState<ProfileInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [formData, setFormData] = useState<UpdateProfileRequest>({});

    // Avatar/Cover state
    const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
    const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
    const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);
    const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await profileService.getProfile(token);
            setProfile(response.data);
            initializeFormData(response.data);
        } catch (error) {
            console.error("Failed to load profile:", error);
            toast.error("Failed to load profile data");
        } finally {
            setLoading(false);
        }
    };

    const initializeFormData = (data: ProfileInfo) => {
        setFormData({
            username: data.username || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            displayName: data.displayName || "",
            bio: data.bio || "",
            timezone: data.timezone || "",
            locale: data.locale || ""
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleEditToggle = () => {
        if (isEditing && profile) {
            initializeFormData(profile);
        }
        setIsEditing(!isEditing);
    };

    const handleSaveProfile = async () => {
        if (!profile) return;

        setIsUpdating(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await profileService.updateProfile(formData, token);
            const updatedProfile = response.data.profile;

            setProfile(updatedProfile);

            // Update user context
            if (user) {
                setUser({
                    ...user,
                    username: updatedProfile.username || user.username,
                    firstName: updatedProfile.firstName || user.firstName,
                    lastName: updatedProfile.lastName || user.lastName,
                    // Don't update avatar/cover here as those are separate endpoints
                });
            }

            toast.success("Profile updated successfully");
            setIsEditing(false);
        } catch (error: any) {
            console.error("Failed to update profile:", error);
            toast.error(error.problemDetails?.title || "Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (type === 'avatar') {
                setAvatarCropSrc(reader.result as string);
                setIsAvatarCropOpen(true);
            } else {
                setCoverCropSrc(reader.result as string);
                setIsCoverCropOpen(true);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };

    const handleAvatarCropped = async (blob: Blob) => {
        setIsUploading(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('No access token');

            const formData = new FormData();
            formData.append('file', blob);

            const response = await profileService.uploadAvatar(formData, token);
            const updatedProfile = response.data.profile;

            setProfile(updatedProfile);

            // Update context with cache-busted URL
            if (user) {
                const avatarUrl = applyCacheBustingParam(updatedProfile.avatarUrl, updatedProfile.updatedAt);
                setUser({ ...user, avatarUrl });
            }

            toast.success("Avatar updated successfully");
        } catch (error) {
            console.error("Avatar upload failed:", error);
            toast.error("Failed to upload avatar");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCoverCropped = async (blob: Blob) => {
        setIsUploading(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('No access token');

            const formData = new FormData();
            formData.append('file', blob);

            const response = await profileService.uploadCover(formData, token);
            const updatedProfile = response.data.profile;

            setProfile(updatedProfile);

            // Update context with cache-busted URL
            if (user) {
                const coverUrl = applyCacheBustingParam(updatedProfile.coverUrl, updatedProfile.updatedAt);
                setUser({ ...user, coverUrl });
            }

            toast.success("Cover image updated successfully");
        } catch (error) {
            console.error("Cover upload failed:", error);
            toast.error("Failed to upload cover image");
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    if (!profile) return null;

    const coverUrl = applyCacheBustingParam(profile.coverUrl, profile.updatedAt);
    const avatarUrl = applyCacheBustingParam(profile.avatarUrl, profile.updatedAt);

    return (
        <div className="min-h-screen bg-background">
            <AvatarCropDialog
                isOpen={isAvatarCropOpen}
                src={avatarCropSrc}
                onOpenChange={setIsAvatarCropOpen}
                onCropped={handleAvatarCropped}
                aspect={1}
                cropShape="round"
                dialogTitle="Adjust Avatar"
            />

            <AvatarCropDialog
                isOpen={isCoverCropOpen}
                src={coverCropSrc}
                onOpenChange={setIsCoverCropOpen}
                onCropped={handleCoverCropped}
                aspect={820 / 312}
                cropShape="rect"
                dialogTitle="Adjust Cover Image"
                outputWidth={820}
                outputHeight={312}
            />

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
                            href="/"
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Home
                        </Link>
                    </motion.div>

                    {/* Header */}
                    <motion.div variants={itemVariants} className="space-y-2">
                        <h1 className="text-3xl font-bold">Profile</h1>
                        <p className="text-muted-foreground">
                            Manage your account settings and personal information
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    <span>Personal Information</span>
                                </CardTitle>
                                <CardDescription>
                                    {isEditing ? "Update your personal information" : "Your basic account information"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Cover Section */}
                                <div className="relative w-full overflow-hidden rounded-xl bg-muted aspect-[820/312]">
                                    {coverUrl ? (
                                        <div className="absolute inset-0">
                                            <Image
                                                src={coverUrl}
                                                alt="Cover"
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, 820px"
                                                unoptimized
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/30" />
                                    )}

                                    {!isEditing && (
                                        <>
                                            <input
                                                ref={coverInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileSelect(e, 'cover')}
                                            />
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="absolute bottom-3 right-3 rounded-full h-9 px-4"
                                                onClick={() => coverInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                <Camera className="h-4 w-4 mr-2" />
                                                Change Cover
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {/* Edit Controls */}
                                <div className="flex items-center justify-end gap-2">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleEditToggle}
                                                disabled={isUpdating}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveProfile}
                                                disabled={isUpdating}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                {isUpdating ? "Saving..." : "Save"}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleEditToggle}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                    )}
                                </div>

                                {/* Avatar Section */}
                                <div className="flex items-center space-x-4">
                                    <div className="relative">
                                        <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                                            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                                            <AvatarFallback className="text-lg">
                                                {profile.firstName?.[0]}{profile.lastName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>

                                        {!isEditing && (
                                            <>
                                                <input
                                                    ref={avatarInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileSelect(e, 'avatar')}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 border border-border"
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    disabled={isUploading}
                                                >
                                                    <Camera className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {profile.displayName || `${profile.firstName} ${profile.lastName}`}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">@{profile.username}</p>
                                        <div className="flex gap-2 mt-1">
                                            {profile.roles.map(role => (
                                                <Badge key={role} variant="secondary" className="capitalize">
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">First Name</label>
                                        {isEditing ? (
                                            <Input
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground">{profile.firstName || "Not set"}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Last Name</label>
                                        {isEditing ? (
                                            <Input
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground">{profile.lastName || "Not set"}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Display Name</label>
                                        {isEditing ? (
                                            <Input
                                                name="displayName"
                                                value={formData.displayName}
                                                onChange={handleInputChange}
                                                placeholder="How you'd like to be called"
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground">{profile.displayName || "Not set"}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Username</label>
                                        {isEditing ? (
                                            <Input
                                                name="username"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground">@{profile.username}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
                                            <span>{profile.email}</span>
                                            <Badge variant={profile.emailVerified ? "outline" : "destructive"} className="text-xs">
                                                {profile.emailVerified ? "Verified" : "Unverified"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Timezone</label>
                                        {isEditing ? (
                                            <Input
                                                name="timezone"
                                                value={formData.timezone}
                                                onChange={handleInputChange}
                                                placeholder="e.g. America/New_York"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-foreground">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span>{profile.timezone || "Not set"}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Locale</label>
                                        {isEditing ? (
                                            <Input
                                                name="locale"
                                                value={formData.locale}
                                                onChange={handleInputChange}
                                                placeholder="e.g. en-US"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-foreground">
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                                <span>{profile.locale || "Not set"}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium">Bio</label>
                                        {isEditing ? (
                                            <textarea
                                                name="bio"
                                                value={formData.bio || ""}
                                                onChange={handleInputChange}
                                                rows={3}
                                                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                                                placeholder="Tell us about yourself..."
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground whitespace-pre-wrap">
                                                {profile.bio || "No bio yet."}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center text-muted-foreground">
                                            <Calendar className="h-4 w-4 mr-2" />
                                            Member since {new Date(profile.createdAt).toLocaleDateString()}
                                        </div>
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
