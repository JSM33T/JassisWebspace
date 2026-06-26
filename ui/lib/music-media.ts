import { type MusicTrack, type TrackDetail } from "@/lib/api/music.types";
import { applyCacheBustingParam } from "@/lib/cacheBust";

type MusicCoverSource =
    | Pick<MusicTrack, "cover" | "createdAt" | "updatedAt">
    | Pick<TrackDetail, "cover" | "createdAt" | "updatedAt">;

export function getVersionedMusicCoverUrl(track: MusicCoverSource): string | undefined {
    return applyCacheBustingParam(track.cover, track.updatedAt || track.createdAt);
}
