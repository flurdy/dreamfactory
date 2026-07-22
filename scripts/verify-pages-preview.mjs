import assert from 'node:assert/strict';

const baseUrl = process.env.PAGES_PREVIEW_BASE_URL;
assert.ok(baseUrl, 'Set PAGES_PREVIEW_BASE_URL to an immutable Pages deployment URL');

async function get(path) {
  const response = await fetch(new URL(path, baseUrl));
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response;
}

function cacheDirectives(response) {
  return new Set((response.headers.get('cache-control') || '').split(',').map(value => value.trim()));
}

const htmlResponse = await get('/');
const htmlCache = cacheDirectives(htmlResponse);
assert.ok(htmlCache.has('max-age=0'), 'HTML must be immediately revalidated');
assert.ok(htmlCache.has('must-revalidate'), 'HTML must require revalidation');
assert.ok(!htmlCache.has('immutable'), 'HTML must not be immutable');
const html = await htmlResponse.text();

const fingerprintedPaths = Array.from(
  html.matchAll(/\/(?:assets|data)\/[^\s"'<>]+\.[a-f0-9]{64}\.[a-z0-9]+/g),
  match => match[0],
);
assert.ok(fingerprintedPaths.some(path => path.endsWith('.css')), 'No fingerprinted stylesheet found');
assert.ok(fingerprintedPaths.some(path => path.endsWith('.js')), 'No fingerprinted script found');
assert.ok(fingerprintedPaths.some(path => path.endsWith('.json')), 'No fingerprinted catalog found');

for (const path of fingerprintedPaths) {
  const response = await get(path);
  const cache = cacheDirectives(response);
  assert.ok(cache.has('max-age=31536000'), `${path} is not cached for one year`);
  assert.ok(cache.has('immutable'), `${path} is not immutable`);
  assert.ok(!cache.has('max-age=0'), `${path} has a conflicting revalidation policy`);
}

console.log(`Pages cache contract passed against ${baseUrl}: HTML revalidates and ${fingerprintedPaths.length} fingerprinted resources are immutable.`);
