#!/usr/bin/env node

import { generateStaticData } from './lib/static-projects.mjs';

const asOfIndex = process.argv.indexOf('--as-of');
const asOf = asOfIndex >= 0 ? process.argv[asOfIndex + 1] : process.env.DREAMFACTORY_AS_OF;
if (asOfIndex >= 0 && !asOf) {
  throw new Error('--as-of requires an ISO timestamp with an explicit timezone');
}

const { catalog, redirects } = generateStaticData({ ...(asOf ? { asOf } : {}) });
console.log(`Generated ${catalog.projectCount} projects at ${catalog.asOf} with ${redirects.trim().split('\n').length} redirects.`);
