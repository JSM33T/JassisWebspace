import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function unusedPort() {
    const probe = createTcpServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    return port;
}

const album = {
    id: 'album-1', name: 'Test album', slug: 'test-album', cover: null,
    description: null, sortOrder: 0, createdAt: '2026-01-01T00:00:00Z',
    imageCount: 0, authors: [],
};
const blog = {
    id: 'blog-1', title: 'Test article', slug: 'test-article',
    excerpt: null, featuredImage: null, category: null,
    publishedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
    authors: [],
};
const track = {
    id: 'track-1', title: 'Test track', slug: 'test-track',
    authors: [], category: 'originals', releaseDate: '2026-01-01T00:00:00Z',
    featured: true, hasPlayableSource: false, duration: null, cover: null,
};

const modes = { gallery: 'hang', blog: 'hang', music: 'hang' };
const api = createServer((request, response) => {
    const feed = request.url?.startsWith('/gallery/albums') ? 'gallery'
        : request.url?.startsWith('/blog') ? 'blog'
            : request.url?.startsWith('/music/tracks') ? 'music' : null;
    if (!feed) {
        response.writeHead(404).end();
        return;
    }
    if (modes[feed] === 'hang') return;
    if (modes[feed] === 'fail') {
        response.writeHead(503).end();
        return;
    }
    const populated = modes[feed] === 'populated';
    const items = populated ? [feed === 'gallery' ? album : feed === 'blog' ? blog : track] : [];
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ data: items }));
});

const apiPort = await unusedPort();
await new Promise((resolve) => api.listen(apiPort, '127.0.0.1', resolve));
const uiPort = await unusedPort();
const ui = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(uiPort)], {
    cwd: process.cwd(),
    env: {
        ...process.env,
        API_URL: `http://127.0.0.1:${apiPort}`,
        CONTENT_FETCH_TIMEOUT_MS: '250',
        HOME_GALLERIES_REVALIDATE_SECONDS: '1',
        HOME_BLOGS_REVALIDATE_SECONDS: '1',
        MUSIC_TRACKS_REVALIDATE_SECONDS: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
ui.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
ui.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });

async function read(path) {
    const response = await fetch(`http://127.0.0.1:${uiPort}${path}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, `${path} returned ${response.status}`);
    return path.startsWith('/api/') ? response.json() : response.text();
}

async function until(check, label) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
            const result = await check();
            if (result) return result;
        } catch (error) {
            if (ui.exitCode !== null) throw new Error(`Next server exited: ${serverOutput}`, { cause: error });
        }
        await delay(200);
    }
    throw new Error(`Timed out waiting for ${label}. Server output: ${serverOutput}`);
}

try {
    await until(async () => serverOutput.includes('Ready in'), 'Next server');

    const started = Date.now();
    const [coldHome, coldMusic] = await Promise.all([read('/api/home-content'), read('/api/music-content')]);
    assert.ok(Date.now() - started < 2000, 'cold feed requests should be bounded');
    assert.equal(coldHome.galleryStatus, 'unavailable');
    assert.equal(coldHome.blogStatus, 'unavailable');
    assert.equal(coldMusic.status, 'unavailable');
    const coldPage = await read('/');
    assert.ok(coldPage.includes('Writing is temporarily unavailable'), 'outage copy should render');
    assert.ok(coldPage.includes('Hi, I'), 'introduction should render');
    assert.ok(coldPage.includes('Projects that show how I approach engineering'), 'projects should render');
    assert.match(serverOutput, /Homepage gallery fetch failed/, 'cold feed failures should be logged');

    Object.assign(modes, { gallery: 'populated', blog: 'fail', music: 'empty' });
    const [partialHome, partialMusic] = await Promise.all([read('/api/home-content'), read('/api/music-content')]);
    assert.equal(partialHome.galleryStatus, 'available');
    assert.equal(partialHome.galleries.length, 1);
    assert.equal(partialHome.blogStatus, 'unavailable');
    assert.equal(partialMusic.status, 'available');
    assert.equal(partialMusic.tracks.length, 0);

    Object.assign(modes, { gallery: 'empty', blog: 'empty', music: 'empty' });
    await delay(1200);
    const emptyHome = await until(async () => {
        const payload = await read('/api/home-content');
        return payload.galleryStatus === 'available' && payload.galleryTotal === 0 && payload.blogStatus === 'available' ? payload : null;
    }, 'successful empty feeds');
    assert.equal(emptyHome.blogTotal, 0);
    const emptyPage = await read('/');
    assert.ok(emptyPage.includes('No articles are published yet'), 'successful empty blog copy should render');

    Object.assign(modes, { gallery: 'populated', blog: 'populated', music: 'populated' });
    await delay(1200);
    const populatedHome = await until(async () => {
        const payload = await read('/api/home-content');
        return payload.galleryStatus === 'available' && payload.blogStatus === 'available'
            && payload.galleryTotal === 1 && payload.blogTotal === 1 ? payload : null;
    }, 'populated feeds');
    const populatedMusic = await until(async () => {
        const payload = await read('/api/music-content');
        return payload.status === 'available' && payload.tracks.length === 1 ? payload : null;
    }, 'populated music');
    assert.equal(populatedHome.blogs[0].title, 'Test article');
    assert.equal(populatedMusic.tracks[0].title, 'Test track');

    Object.assign(modes, { gallery: 'fail', blog: 'fail', music: 'fail' });
    await delay(1200);
    const [cachedHome, cachedMusic] = await Promise.all([read('/api/home-content'), read('/api/music-content')]);
    assert.equal(cachedHome.galleryStatus, 'cached');
    assert.equal(cachedHome.blogStatus, 'cached');
    assert.equal(cachedHome.galleries.length, 1);
    assert.equal(cachedHome.blogs.length, 1);
    assert.equal(cachedMusic.status, 'cached');
    assert.equal(cachedMusic.tracks.length, 1);
    const cachedPage = await read('/');
    assert.ok(cachedPage.includes('Writing may be out of date'), 'cached content should be labelled');
    assert.ok(!cachedPage.includes('No articles are published yet'), 'outage must not look like an empty archive');

    console.log('Home feed checks passed: timeout, partial outage, empty, populated, cached outage.');
} finally {
    ui.kill('SIGTERM');
    api.closeAllConnections();
    await new Promise((resolve) => api.close(resolve));
}
