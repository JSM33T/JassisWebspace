import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const directory = mkdtempSync(join(tmpdir(), 'projects-check-'));

try {
    const source = readFileSync(new URL('../data/projects.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const modulePath = join(directory, 'projects.mjs');
    writeFileSync(modulePath, compiled);
    const { projects } = await import(pathToFileURL(modulePath).href);

    assert.equal(projects.length, 13, 'All reviewed projects remain present');
    assert.equal(new Set(projects.map((project) => project.slug)).size, projects.length, 'Project slugs are unique');

    for (const project of projects) {
        assert.match(project.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${project.title} has a URL-safe slug`);
        assert.ok(project.title.trim(), `${project.slug} has a title`);
        assert.ok(project.description.trim(), `${project.slug} has a description`);
        assert.ok(Array.isArray(project.screenshots), `${project.slug} has a screenshots collection`);

        const legacySlug = project.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        assert.equal(project.slug, legacySlug, `${project.slug} preserves its former query identifier`);

        for (const screenshot of project.screenshots) {
            if (!screenshot.startsWith('/')) continue;
            assert.ok(existsSync(new URL(`../public${screenshot}`, import.meta.url)), `${project.slug} screenshot exists: ${screenshot}`);
        }
    }

    console.log(`Project checks passed: ${projects.length} stable, unique slugs with compatible legacy identifiers and valid local screenshots.`);
} finally {
    rmSync(directory, { recursive: true, force: true });
}
