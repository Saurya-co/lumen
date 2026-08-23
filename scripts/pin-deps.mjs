import { readFileSync, writeFileSync } from "fs";
import path from "path";

/**
 * pin-deps.mjs — rewrites package.json dependency ranges (^x.y.z) to the
 * exact versions currently installed in node_modules. Run once, then
 * `npm install` to regenerate a fully-pinned lockfile.
 */
const root = process.cwd();
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

function pin(section) {
  const out = {};
  for (const name of Object.keys(section)) {
    const pjPath = path.join(root, "node_modules", name, "package.json");
    try {
      const pj = JSON.parse(readFileSync(pjPath, "utf8"));
      out[name] = pj.version;
    } catch {
      console.error(`✗ Cannot resolve installed version for: ${name}`);
      process.exit(1);
    }
  }
  return out;
}

pkg.dependencies = pin(pkg.dependencies);
pkg.devDependencies = pin(pkg.devDependencies);

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(
  `✓ Pinned ${Object.keys(pkg.dependencies).length} deps + ` +
  `${Object.keys(pkg.devDependencies).length} devDeps to exact versions.`
);
