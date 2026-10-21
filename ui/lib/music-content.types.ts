import { type MusicTrack } from "@/lib/api/music.types";
import { type FeedStatus } from "@/lib/feed-status";

export interface MusicContentPayload {
    tracks: MusicTrack[];
    status: FeedStatus;
}
