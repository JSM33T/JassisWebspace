import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const directory = mkdtempSync(join(tmpdir(), 'services-check-'));

try {
    const compile = (sourceUrl, outputName) => {
        const source = readFileSync(sourceUrl, 'utf8');
        const compiled = ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
        }).outputText;
        const modulePath = join(directory, outputName);
        writeFileSync(modulePath, compiled);
        return modulePath;
    };

    const servicesPath = compile(new URL('../data/services.ts', import.meta.url), 'services.mjs');
    const projectsPath = compile(new URL('../data/projects.ts', import.meta.url), 'projects.mjs');
    const { services, availableServices, unavailableServices, getServiceBySlug, getServiceEnquiryHref } = await import(pathToFileURL(servicesPath).href);
    const { projects } = await import(pathToFileURL(projectsPath).href);
    const projectPaths = new Set(projects.map((project) => `/projects/${project.slug}`));

    assert.equal(services.length, 12, 'All reviewed service entries remain present');
    assert.equal(availableServices.length, 4, 'The four reviewed active services remain available');
    assert.equal(unavailableServices.length, 8, 'Paused capabilities remain explicitly unavailable');
    assert.equal(new Set(services.map((service) => service.slug)).size, services.length, 'Service slugs are unique');

    for (const service of services) {
        assert.match(service.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${service.title} has a URL-safe slug`);
        assert.equal(getServiceBySlug(service.slug), service, `${service.slug} resolves from the shared model`);
        assert.ok(service.title.trim(), `${service.slug} has a title`);
        assert.ok(service.summary.trim(), `${service.slug} has a summary`);
        assert.ok(service.audience.trim(), `${service.slug} identifies its audience`);
        assert.ok(service.problem.trim(), `${service.slug} describes a problem`);
        assert.ok(service.nextStep.trim(), `${service.slug} has a next step`);
        assert.ok(service.availabilityNote.trim(), `${service.slug} explains availability`);

        for (const evidence of service.evidence) {
            assert.ok(projectPaths.has(evidence.href), `${service.slug} evidence resolves to a known project: ${evidence.href}`);
        }

        if (service.availability === 'available') {
            assert.ok(service.deliverables.length >= 3, `${service.slug} lists concrete deliverables`);
            assert.ok(service.evidence.length > 0, `${service.slug} links to relevant work`);
            const enquiryUrl = new URL(getServiceEnquiryHref(service), 'https://jassi.me');
            assert.equal(enquiryUrl.pathname, '/contact');
            assert.equal(enquiryUrl.searchParams.get('purpose'), 'Service Request');
            assert.equal(enquiryUrl.searchParams.get('service'), service.slug);
            assert.equal(enquiryUrl.searchParams.get('ref'), `/services?service=${service.slug}`);
        }
    }

    assert.equal(getServiceBySlug('unknown-service'), null, 'Unknown service slugs do not resolve');
    console.log('Service checks passed: 12 typed entries, explicit availability, valid evidence links, and service-aware enquiry URLs.');
} finally {
    rmSync(directory, { recursive: true, force: true });
}
