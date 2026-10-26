import { getHomeContentCached } from "@/lib/server/home-content-cache";
import { getMusicContentCached } from "@/lib/server/music-content-cache";
import { HomePageClient } from "./_components/home-page-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const [homeContent, musicContent] = await Promise.all([
        getHomeContentCached(),
        getMusicContentCached(),
    ]);

    return (
        <HomePageClient
            galleries={homeContent.galleries}
            galleryTotal={homeContent.galleryTotal}
            galleryStatus={homeContent.galleryStatus}
            blogs={homeContent.blogs}
            blogTotal={homeContent.blogTotal}
            blogStatus={homeContent.blogStatus}
            musicTracks={musicContent.tracks}
            musicStatus={musicContent.status}
        />
    );
}
