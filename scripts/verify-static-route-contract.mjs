import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.ROUTE_CONTRACT_BASE_URL || 'http://localhost:4176';
const verifyRedirects = process.env.ROUTE_CONTRACT_VERIFY_REDIRECTS === 'true';
const manifest = JSON.parse(await readFile('static-site/public/route-manifest.json', 'utf8'));

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
  if (response.status !== 200) failures.push(`${route.path}: expected 200, got ${response.status}`);
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
