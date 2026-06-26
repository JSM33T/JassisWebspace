const MUSIC_TRACKS_TAG = "music-tracks-feed";

function getToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("accessToken");
}

export async function revalidateMusicTracksFeedCache(): Promise<void> {
    const token = getToken();
    const response = await fetch("/api/admin/cache/home", {
        method: "POST",
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ tag: MUSIC_TRACKS_TAG }),
        cache: "no-store",
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to revalidate music tracks cache.");
    }
}

export async function revalidateMusicTracksFeedCacheBestEffort(context: string): Promise<void> {
    try {
        await revalidateMusicTracksFeedCache();
    } catch (error) {
        console.warn(`Music tracks cache refresh failed after ${context}`, error);
    }
}
