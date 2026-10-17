export function directArtifactDownloadUrl(token: string): string {
    const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
    return `${api}/artifact-shares/${encodeURIComponent(token)}?directdl=true`;
}
