// @bun
// @ts-ignore
import splitgPkg from '@jondotsoy/splitg/package.json';

await Bun.write(new URL("splitg-package.ts", import.meta.url), `export const splitgPackage = ${JSON.stringify({
    version: splitgPkg.version,
}, null, 2)} as const;`);

