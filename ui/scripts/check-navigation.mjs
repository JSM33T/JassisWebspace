import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Transpile locally so this check also works on Node 20 without a TS test runner.
const directory = mkdtempSync(join(tmpdir(), 'site-navigation-'));
try {
    const source = readFileSync(new URL('../lib/site-navigation.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText.replace("from 'lucide-react'", `from '${import.meta.resolve('lucide-react')}'`);
    const modulePath = join(directory, 'navigation.mjs');
    writeFileSync(modulePath, compiled);
    const { isNavigationActive, navigationAriaCurrent, primaryNavigation, navigationSections, footerUtilityLinks } = await import(pathToFileURL(modulePath).href);

    for (const [pathname, href, expected] of [
        ['/', '/', true],
        ['/blog', '/', false],
        ['/blog', '/blog', true],
        ['/blog/an-article', '/blog', true],
        ['/blog/an-article/edit', '/blog', true],
        ['/blogger', '/blog', false],
        ['/projects?project=example', '/projects', true],
        ['/projects/example', '/projects', true],
        ['/projects-old', '/projects', false],
        ['/services/', '/services', true],
        ['/gallery/an-album#comments', '/gallery', true],
        ['/music/a-track', '/music', true],
        ['/account/profile', '/about', false],
    ]) {
        assert.equal(isNavigationActive(pathname, href), expected, `${pathname} matches ${href}`);
    }
    assert.equal(navigationAriaCurrent('/blog/', '/blog'), 'page');
    assert.equal(navigationAriaCurrent('/blog/article', '/blog'), 'location');
    assert.equal(navigationAriaCurrent('/blogger', '/blog'), undefined);

    const desktopItems = primaryNavigation.flatMap((entry) => 'items' in entry ? entry.items : [entry]);
    const sectionItems = navigationSections.flatMap((section) => section.items);
    assert.deepEqual(desktopItems.map((item) => item.href).sort(), sectionItems.map((item) => item.href).sort(), 'Desktop, mobile, and footer expose the same content destinations');
    assert.deepEqual(primaryNavigation.map((entry) => entry.label), ['Home', 'Explore', 'Work', 'About'], 'Desktop navigation stays compact');
    assert.deepEqual(
        primaryNavigation.filter((entry) => 'items' in entry).map((entry) => [entry.label, entry.items.map((item) => item.label)]),
        [
            ['Explore', ['Blog', 'Gallery', 'Music']],
            ['Work', ['Projects', 'Services']],
            ['About', ['About', 'Uses', 'Contact']],
        ],
        'Desktop destinations are classified into the intended submenus'
    );
    const items = [...sectionItems, ...footerUtilityLinks];
    assert.equal(new Set(items.map((item) => item.href)).size, items.length, 'Destinations are not duplicated across groups');
    for (const item of items) {
        const route = item.href === '/' ? '' : item.href.slice(1) + '/';
        assert.ok(existsSync(new URL(`../app/${route}page.tsx`, import.meta.url)), `${item.href} resolves to an existing page`);
    }
    console.log('Navigation checks passed: route boundaries, current-page semantics, destination parity, and route existence.');
} finally {
    rmSync(directory, { recursive: true, force: true });
}
