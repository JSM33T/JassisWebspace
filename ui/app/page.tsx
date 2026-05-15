import { Suspense } from "react";

import { getHomeContentCached } from "@/lib/server/home-content-cache";
import { getMusicContentCached } from "@/lib/server/music-content-cache";
import { HomePageClient } from "./_components/home-page-client";

export default async function HomePage() {
    const [homeContent, musicContent] = await Promise.all([
        getHomeContentCached(),
        getMusicContentCached(),
    ]);

    return (
        <Suspense>
            <HomePageClient
                galleries={homeContent.galleries}
                galleryTotal={homeContent.galleryTotal}
                blogs={homeContent.blogs}
                blogTotal={homeContent.blogTotal}
                musicTracks={musicContent.tracks}
            />
        </Suspense>
    );
}
