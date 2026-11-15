function publicArtifactUrl(id: string) {
    const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
    return `${api}/public-artifacts/${encodeURIComponent(id)}`;
}

export function artifactDownloadUrl(id: string) {
    return `${publicArtifactUrl(id)}/download`;
}

export function artifactCoverUrl(id: string) {
    return `${publicArtifactUrl(id)}/cover`;
}
