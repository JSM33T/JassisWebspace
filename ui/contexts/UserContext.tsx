"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

// User interface definition
export interface User {
    id?: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    avatarUrl?: string;
    coverUrl?: string;
    bio?: string;
    login: boolean;
    expiry?: Date;
    // Tier information
    tierId?: number;
    tierName?: string;
    // Additional optional fields
    role?: string;
    preferences?: Record<string, any>;
}

// Context value interface
interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    updateUser: (updates: Partial<User>) => void;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isTokenExpired: () => boolean;
    isInitialized: boolean;
}

// Create the context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Storage keys
const USER_STORAGE_KEY = 'jassspace_user';

// Default user state
const defaultUser: User | null = null;

// Helper functions for localStorage operations
const userStorage = {
    save: (user: User | null) => {
        if (typeof window !== 'undefined') {
            if (user) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
                    ...user,
                    expiry: user.expiry?.toISOString() // Convert Date to string for storage
                }));
            } else {
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
    },

    load: (): User | null => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem(USER_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Convert expiry back to Date object
                    if (parsed.expiry) {
                        parsed.expiry = new Date(parsed.expiry);
                    }
                    return parsed;
                }
            } catch (error) {
                console.error('Error loading user from localStorage:', error);
                localStorage.removeItem(USER_STORAGE_KEY);
            }
        }
        return null;
    },

    clear: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(USER_STORAGE_KEY);
        }
    }
};

// UserProvider component
interface UserProviderProps {
    children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
    const [user, setUser] = useState<User | null>(defaultUser);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize user context on mount - restore from localStorage
    useEffect(() => {
        const initializeUser = async () => {
            const storedUser = userStorage.load();
            const storedToken = localStorage.getItem('accessToken');

            if (storedUser) {
                // We have user data - check if it's still valid
                if (storedUser.expiry && new Date() > storedUser.expiry) {
                    // User session has expired completely, clear everything
                    userStorage.clear();
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    setUser(null);
                } else {
                    // User session is still valid, restore user
                    const userWithLogin = { ...storedUser, login: true };
                    setUser(userWithLogin);
                    userStorage.save(userWithLogin);
                    console.log('✅ User data restored from localStorage');
                }
                setIsInitialized(true);
            } else if (storedToken) {
                // Token exists but no user data - try to fetch user info
                try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        const restoredUser: User = {
                            id: userData.id,
                            firstName: userData.firstName || '',
                            lastName: userData.lastName || '',
                            username: userData.username || '',
                            email: userData.email || '',
                            avatarUrl: userData.avatarUrl,
                            login: true,
                            tierId: userData.tierId,
                            tierName: userData.tierName,
                            role: userData.roles?.[0] || 'user'
                        };

                        setUser(restoredUser);
                        userStorage.save(restoredUser);
                        console.log('✅ User session restored from token');
                    } else {
                        // Token is invalid, clear it
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                    }
                } catch (error) {
                    console.error('Error restoring session:', error);
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }
                setIsInitialized(true);
            } else {
                // No user data and no token
                setUser(null);
                setIsInitialized(true);
            }
        };

        initializeUser();
    }, []);

    // Custom setUser that also persists to localStorage
    const setUserWithPersistence = useCallback((newUser: User | null) => {
        setUser(newUser);
        userStorage.save(newUser);
        if (newUser) {
            console.log('✅ User data set and persisted:', newUser.username || newUser.email);
        }
    }, []);

    // Update user with partial data
    const updateUser = useCallback((updates: Partial<User>) => {
        setUser(currentUser => {
            if (!currentUser) return null;
            const updatedUser = { ...currentUser, ...updates };
            userStorage.save(updatedUser); // Persist the update
            return updatedUser;
        });
    }, []);

    // Logout function
    const logout = useCallback(async (): Promise<void> => {
        // Optional: Call backend logout endpoint
        const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (refreshToken) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken })
            }).catch(() => {
                // Ignore errors - we're logging out anyway
            });
        }

        // Clear local state/storage immediately
        setUser(null);
        userStorage.clear();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }

        return;
    }, []);

    // Check if user is authenticated
    const isAuthenticated = user?.login === true;

    // Check if token is expired
    const isTokenExpired = useCallback(() => {
        if (!user?.expiry) return false;
        return new Date() > user.expiry;
    }, [user?.expiry]);

    const contextValue: UserContextType = {
        user,
        setUser: setUserWithPersistence,
        updateUser,
        logout,
        isAuthenticated,
        isTokenExpired,
        isInitialized,
    };

    // Show loading state while initializing
    if (!isInitialized) {
        return (
            <UserContext.Provider value={contextValue}>
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                </div>
            </UserContext.Provider>
        );
    }

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}

// Custom hook to use the UserContext
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}

// Helper functions for working with user data
export const userHelpers = {
    getFullName: (user: User | null): string => {
        if (!user) return 'Guest';
        return `${user.firstName} ${user.lastName}`.trim();
    },

    getDisplayName: (user: User | null): string => {
        if (!user) return 'Guest';
        return user.username || userHelpers.getFullName(user);
    },

    getFirstName: (user: User | null): string => {
        if (!user) return 'Guest';
        if (user.firstName && user.firstName.trim().length > 0) return user.firstName;
        if (user.username) return user.username;
        return userHelpers.getFullName(user).split(' ')[0] || 'Guest';
    },

    getLastName: (user: User | null): string => {
        if (!user) return '';
        return user.lastName || '';
    },

    getAvatarUrl: (user: User | null): string => {
        if (!user) return '/placeholder-avatar.jpg';
        return user.avatarUrl || '/placeholder-avatar.jpg';
    },

    getInitials: (user: User | null): string => {
        if (!user) return 'G';
        const firstName = user.firstName?.charAt(0)?.toUpperCase() || '';
        const lastName = user.lastName?.charAt(0)?.toUpperCase() || '';
        return firstName + lastName || user.username?.charAt(0)?.toUpperCase() || 'U';
    },

    isSessionValid: (user: User | null): boolean => {
        if (!user?.login) return false;
        if (!user.expiry) return true; // No expiry means valid
        return new Date() < user.expiry;
    },

    getTierName: (user: User | null): string => {
        return user?.tierName?.toLowerCase() ?? 'free';
    },

    getTierDisplayName: (user: User | null): string => {
        const tierName = userHelpers.getTierName(user);
        return tierName.charAt(0).toUpperCase() + tierName.slice(1);
    },

    isFreeTier: (user: User | null): boolean => {
        if (!user) return true;
        return user.tierId === 1 || userHelpers.getTierName(user) === 'free';
    },

    isPlusTier: (user: User | null): boolean => {
        return user?.tierId === 2 || userHelpers.getTierName(user) === 'plus';
    },

    isProTier: (user: User | null): boolean => {
        return user?.tierId === 3 || userHelpers.getTierName(user) === 'pro';
    },
};
