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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Camera, User, Edit, Save, X, Clock, Globe } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import authService from "@/lib/api/auth.service";
import AvatarCropDialog from "@/components/profile/AvatarCropDialog";
import { buildAuthRequiredLoginHref, persistLoginRedirectTarget } from "@/lib/auth-redirect";

interface ProfileData {
    username?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    bio?: string;
    timezone?: string;
    locale?: string;
    email?: string;
    emailVerified?: boolean;
    createdAt?: string;
    roles?: string[];
    avatarUrl?: string | null;
    coverUrl?: string | null;
}

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
    const [isMounted, setIsMounted] = useState(false);
    const { user, setUser, updateUser, isInitialized } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentPathWithQuery = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState<ProfileData>({});

    // Crop dialog states
    const [isAvatarCropOpen, setIsAvatarCropOpen] = useState(false);
    const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
    const [isCoverCropOpen, setIsCoverCropOpen] = useState(false);
    const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Fetch fresh profile data on mount
    useEffect(() => {
        const fetchProfile = async () => {
            if (!isMounted) return;
            try {
                const userInfo = await authService.getCurrentUser();
                if (userInfo) {
                    updateUser({
                        id: userInfo.id,
                        firstName: userInfo.firstName || "",
                        lastName: userInfo.lastName || "",
                        username: userInfo.username || "",
                        email: userInfo.email,
                        avatarUrl: userInfo.avatarUrl || undefined,
                        coverUrl: userInfo.coverUrl || undefined,
                        bio: userInfo.bio || undefined,
                        role: userInfo.roles?.[0] || 'user',
                        preferences: userInfo.preferences || undefined,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch fresh profile", error);
                // Optionally handle error, e.g. if 401, context might handle logout
            }
        };

        fetchProfile();
    }, [isMounted, updateUser]);

    const handleEditToggle = () => {
        if (isEditing) {
            // Reset form data to current user data when cancelling
            if (user) {
                setFormData({
                    username: user.username || "",
                    firstName: user.firstName || "",
                    lastName: user.lastName || "",
                    displayName: `${user.firstName} ${user.lastName}`.trim(),
                    bio: user.bio || "",
                    timezone: user.preferences?.timezone || "",
                    locale: user.preferences?.locale || "",
                    email: user.email,
                    emailVerified: true,
                    roles: user.role ? [user.role] : [],
                    avatarUrl: user.avatarUrl,
                    coverUrl: user.coverUrl
                });
            }
        }
        setIsEditing(!isEditing);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                const src = reader.result?.toString() || null;
                if (type === 'avatar') {
                    setAvatarCropSrc(src);
                    setIsAvatarCropOpen(true);
                } else {
                    setCoverCropSrc(src);
                    setIsCoverCropOpen(true);
                }
            });
            reader.readAsDataURL(file);
            // Reset input value to allow selecting same file again
            e.target.value = '';
        }
    };

    const handleAvatarCropped = async (blob: Blob) => {
        setIsAvatarCropOpen(false);
        if (!user) return;
        setIsUploading(true);

        try {
            const response = await authService.uploadAvatar(blob);
            toast.success("Avatar updated successfully!");

            // Validate response.profile before updating
            if (response.profile) {
                const timestamp = Date.now();
                const newAvatarUrl = response.profile.avatarUrl
                    ? `${response.profile.avatarUrl}?t=${timestamp}`
                    : undefined;

                // Update form data with new URL
                setFormData(prev => ({ ...prev, avatarUrl: newAvatarUrl }));

                // Update global user context - merging response with existing persistent state
                setUser({
                    ...user,
                    ...response.profile,
                    // Ensure non-nullable fields are handled
                    firstName: response.profile.firstName || "",
                    lastName: response.profile.lastName || "",
                    username: response.profile.username || "",
                    // Handle nullable fields
                    avatarUrl: newAvatarUrl,
                    coverUrl: response.profile.coverUrl || undefined,
                    bio: response.profile.bio || undefined,
                    preferences: response.profile.preferences || undefined,
                    authMethod: response.profile.authMethod || undefined,
                    // Ensure these are preserved/mapped correctly
                    role: response.profile.roles?.[0] || user.role,
                    login: user.login,
                    expiry: user.expiry
                });
            }
        } catch (error) {
            console.error("Error updating avatar:", error);
            toast.error("Failed to update avatar");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCoverCropped = async (blob: Blob) => {
        setIsCoverCropOpen(false);
        if (!user) return;
        setIsUploading(true);

        try {
            const response = await authService.uploadCover(blob);
            toast.success("Cover image updated successfully!");

            // Validate response.profile before updating
            if (response.profile) {
                const timestamp = Date.now();
                const newCoverUrl = response.profile.coverUrl
                    ? `${response.profile.coverUrl}?t=${timestamp}`
                    : undefined;

                // Update form data
                setFormData(prev => ({ ...prev, coverUrl: newCoverUrl }));

                // Update global user context
                setUser({
                    ...user,
                    ...response.profile,
                    // Ensure non-nullable fields are handled
                    firstName: response.profile.firstName || "",
                    lastName: response.profile.lastName || "",
                    username: response.profile.username || "",
                    // Handle nullable fields
                    avatarUrl: response.profile.avatarUrl || undefined,
                    coverUrl: newCoverUrl,
                    bio: response.profile.bio || undefined,
                    preferences: response.profile.preferences || undefined,
                    authMethod: response.profile.authMethod || undefined,
                    role: response.profile.roles?.[0] || user.role,
                    login: user.login,
                    expiry: user.expiry
                });
            }
        } catch (error) {
            console.error("Error updating cover:", error);
            toast.error("Failed to update cover");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsUploading(true);
        try {
            const updateRequest = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                username: formData.username,
                displayName: formData.displayName,
                bio: formData.bio,
                timezone: formData.timezone,
                locale: formData.locale,
                // Do not send avatarUrl/coverUrl here as they are updated via separate endpoints
            };

            const response = await authService.updateProfile(updateRequest);

            if (response.profile) {
                setUser({
                    ...user,
                    ...response.profile,
                    // Ensure non-nullable fields are handled
                    firstName: response.profile.firstName || "",
                    lastName: response.profile.lastName || "",
                    username: response.profile.username || "",
                    // Handle nullable fields
                    avatarUrl: response.profile.avatarUrl || undefined,
                    coverUrl: response.profile.coverUrl || undefined,
                    bio: response.profile.bio || undefined,
                    preferences: response.profile.preferences || undefined,
                    authMethod: response.profile.authMethod || undefined,
                    role: response.profile.roles?.[0] || user.role,
                    login: user.login,
                    expiry: user.expiry
                });
            }
            setIsEditing(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Failed to update profile");
        } finally {
            setIsUploading(false);
        }
    };


    // Ensure we only render on the client
    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || !isInitialized) {
            return;
        }

        if (!user) {
            persistLoginRedirectTarget(currentPathWithQuery);
            router.replace(buildAuthRequiredLoginHref(currentPathWithQuery));
        }
    }, [currentPathWithQuery, isInitialized, isMounted, router, user]);

    // Initialize form data when user changes or editing starts
    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || "",
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                displayName: `${user.firstName} ${user.lastName}`.trim(),
                bio: user.bio || "",
                timezone: user.preferences?.timezone || "",
                locale: user.preferences?.locale || "",
                email: user.email,
                emailVerified: true, // Mocked as not in User interface
                createdAt: undefined, // Not in User interface
                roles: user.role ? [user.role] : [],
                avatarUrl: user.avatarUrl,
                coverUrl: user.coverUrl
            });
        }
    }, [user]);

    // ... existing handlers ...

    // Don't render anything until mounted on client
    if (!isMounted) return null;

    // Show loading state while context is initializing
    if (!isInitialized) {
        return <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

    if (!user) {
        return <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>;
    }

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
                                    {user.coverUrl ? (
                                        <div className="absolute inset-0">
                                            <Image
                                                src={user.coverUrl}
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
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveProfile}
                                            >
                                                <Save className="h-4 w-4 mr-2" />
                                                Save
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
                                            <AvatarImage src={user.avatarUrl || undefined} alt="Profile" />
                                            <AvatarFallback className="text-lg">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
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
                                            {user.firstName} {user.lastName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                                        <div className="flex gap-2 mt-1">
                                            {user.role && (
                                                <Badge variant="secondary" className="capitalize">
                                                    {user.role}
                                                </Badge>
                                            )}
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
                                            <p className="text-sm text-foreground">{user.firstName || "Not set"}</p>
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
                                            <p className="text-sm text-foreground">{user.lastName || "Not set"}</p>
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
                                            <p className="text-sm text-foreground">{user.firstName} {user.lastName}</p>
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
                                            <p className="text-sm text-foreground">@{user.username}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
                                            <span>{user.email}</span>
                                            <Badge variant="outline" className="text-xs">
                                                Verified
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
                                                <span>{user.preferences?.timezone || "Not set"}</span>
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
                                                <span>{user.preferences?.locale || "Not set"}</span>
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
                                                {user.bio || "No bio yet."}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    {/* Removed Created At since it's not in User interface */}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
