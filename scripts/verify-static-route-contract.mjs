import assert from 'node:assert/strict';

const baseUrl = process.env.ROUTE_CONTRACT_BASE_URL || 'http://localhost:4176';
const verifyRedirects = process.env.ROUTE_CONTRACT_VERIFY_REDIRECTS === 'true';
const manifestResponse = await fetch(new URL('/route-manifest.json', baseUrl));
assert.equal(manifestResponse.status, 200, `Could not fetch route manifest from ${baseUrl}`);
const manifest = await manifestResponse.json();

async function request(path) {
  const response = await fetch(new URL(path, baseUrl), { redirect: 'manual' });
  return {
    path,
    status: response.status,
    location: response.headers.get('location'),
  };
}

const failures = [];
for (const route of manifest.canonicalRoutes) {
  const response = await request(route.path);
  if (route.trailingSlash && response.status === 308) {
    const destination = response.location && new URL(response.location, baseUrl).pathname;
    const expectedDestination = `${route.path}/`;
    if (!destination || decodeURIComponent(destination) !== decodeURIComponent(expectedDestination)) {
      failures.push(`${route.path}: expected 308 -> ${expectedDestination}, got 308 -> ${response.location}`);
      continue;
    }
    const canonicalResponse = await request(expectedDestination);
    if (canonicalResponse.status !== 200) {
      failures.push(`${expectedDestination}: expected 200 after trailing-slash normalization, got ${canonicalResponse.status}`);
    }
  } else if (response.status !== 200) {
    failures.push(`${route.path}: expected 200, got ${response.status}`);
  }
}
for (const path of manifest.expectedNotFound) {
  const response = await request(path);
  if (response.status !== 404) failures.push(`${path}: expected 404, got ${response.status}`);
}
if (verifyRedirects) {
  for (const redirect of manifest.redirects) {
    const response = await request(redirect.from);
    const destination = response.location && new URL(response.location, baseUrl).pathname;
    if (response.status !== redirect.status || destination !== redirect.to) {
      failures.push(
        `${redirect.from}: expected ${redirect.status} -> ${redirect.to}, got ${response.status} -> ${response.location}`,
      );
    }
  }
}

assert.deepEqual(failures, [], `Route-contract failures:\n${failures.join('\n')}`);
console.log(
  `Route contract passed against ${baseUrl}: ${manifest.canonicalRoutes.length} canonical routes, ` +
  `${manifest.expectedNotFound.length} expected 404s${verifyRedirects ? `, ${manifest.redirects.length} redirects` : ''}.`,
);
