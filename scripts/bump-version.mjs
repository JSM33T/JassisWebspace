import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const COMPONENTS = new Set(['ui', 'api']);
const RELEASE_TYPES = new Set(['major', 'minor', 'patch']);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const paths = {
  manifest: resolve(repositoryRoot, 'version.json'),
  package: resolve(repositoryRoot, 'ui/package.json'),
  packageLock: resolve(repositoryRoot, 'ui/package-lock.json'),
  apiProject: resolve(repositoryRoot, 'api/JassSpace.Api/JassSpace.Api.csproj'),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function readXmlProperty(xml, property) {
  return xml.match(new RegExp(`<${property}>([^<]+)</${property}>`))?.[1];
}

function assertValid(manifest, packageJson, packageLock, apiProject) {
  const errors = [];

  for (const component of COMPONENTS) {
    if (!manifest[component]?.name?.trim()) {
      errors.push(`version.json is missing ${component}.name`);
    }

    if (!SEMVER_PATTERN.test(manifest[component]?.version ?? '')) {
      errors.push(`version.json has an invalid ${component} version: ${manifest[component]?.version ?? '<missing>'}`);
    }
  }

  if (packageJson.name !== manifest.ui?.name || packageLock.name !== manifest.ui?.name ||
      packageLock.packages?.['']?.name !== manifest.ui?.name) {
    errors.push('UI package name does not match version.json');
  }

  if (packageJson.version !== manifest.ui?.version || packageLock.version !== manifest.ui?.version ||
      packageLock.packages?.['']?.version !== manifest.ui?.version) {
    errors.push('UI package version does not match version.json');
  }

  if (readXmlProperty(apiProject, 'Product') !== manifest.api?.name ||
      readXmlProperty(apiProject, 'AssemblyTitle') !== manifest.api?.name) {
    errors.push('API project name does not match version.json');
  }

  if (readXmlProperty(apiProject, 'Version') !== manifest.api?.version) {
    errors.push('API project version does not match version.json');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function increment(version, releaseType) {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (releaseType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

const component = process.argv[2] ?? 'check';
const releaseType = process.argv[3];
const isCheck = component === 'check' && releaseType === undefined;

if (!isCheck && (!COMPONENTS.has(component) || !RELEASE_TYPES.has(releaseType))) {
  throw new Error('Usage: node scripts/bump-version.mjs check | <ui|api> <major|minor|patch>');
}

const [manifest, packageJson, packageLock, apiProject] = await Promise.all([
  readJson(paths.manifest),
  readJson(paths.package),
  readJson(paths.packageLock),
  readFile(paths.apiProject, 'utf8'),
]);

assertValid(manifest, packageJson, packageLock, apiProject);

if (isCheck) {
  console.log(`${manifest.ui.name} ${manifest.ui.version}; ${manifest.api.name} ${manifest.api.version}`);
  process.exit(0);
}

const previousVersion = manifest[component].version;
const nextVersion = increment(previousVersion, releaseType);
manifest[component].version = nextVersion;

const writes = [
  writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`),
];

if (component === 'ui') {
  packageJson.version = nextVersion;
  packageLock.version = nextVersion;
  packageLock.packages[''].version = nextVersion;
  writes.push(
    writeFile(paths.package, `${JSON.stringify(packageJson, null, 2)}\n`),
    writeFile(paths.packageLock, `${JSON.stringify(packageLock, null, 2)}\n`),
  );
} else {
  const updatedApiProject = apiProject.replace(
    /<Version>[^<]+<\/Version>/,
    `<Version>${nextVersion}</Version>`,
  );
  writes.push(writeFile(paths.apiProject, updatedApiProject));
}

await Promise.all(writes);
console.log(`Bumped ${manifest[component].name} from ${previousVersion} to ${nextVersion} (${releaseType})`);
