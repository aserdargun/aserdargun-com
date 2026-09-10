import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootFiles = new Set(['index.html', 'styles.css', 'scripts.js', 'portfolio.json', 'llms.txt', 'robots.txt', 'sitemap.xml', 'staticwebapp.config.json']);
const assetExtensions = {
  fonts: new Set(['.woff', '.woff2']),
  images: new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.svg']),
  icons: new Set(['.ico', '.svg', '.png', '.webmanifest']),
  videos: new Set(['.mp4', '.webm', '.vtt']),
};

// One public-file boundary for the preview server and deployment artifact.
export function isPublicFile(relativePath) {
  const parts = relativePath.split('/');
  if (parts.some(part => !part || part.startsWith('.') || part.includes('\\'))) return false;
  if (rootFiles.has(relativePath)) return true;
  if (/^(?:tr\/)?(?:(?:about|applications|journey|memory|now)\/)?index\.html$/.test(relativePath)) return true;
  if (/^(?:tr\/)?now\/archive\/\d{4}-W\d{2}\/index\.html$/.test(relativePath)) return true;
  if (relativePath === 'schemas/aserdargun-app.schema.json') return true;
  return parts.length > 1 && (assetExtensions[parts[0]]?.has(path.posix.extname(relativePath)) ?? false);
}

export async function publicFiles(root) {
  const result = [];
  const directories = new Set(['tr', 'about', 'applications', 'journey', 'memory', 'now', 'schemas', ...Object.keys(assetExtensions)]);
  async function visit(directory = '') {
    for (const entry of await readdir(path.join(root, directory), {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const relativePath = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory() && (directory || directories.has(entry.name))) await visit(relativePath);
      else if (entry.isFile() && isPublicFile(relativePath)) result.push(relativePath);
      // Symlinks are deliberately never followed into the artifact.
    }
  }
  await visit();
  return result.sort();
}

export async function buildPublicSite(root) {
  const output = path.join(root, '.site-dist');
  const files = await publicFiles(root);
  await rm(output, {recursive: true, force: true});
  await mkdir(output, {recursive: true});
  for (const file of files) {
    const destination = path.join(output, file);
    await mkdir(path.dirname(destination), {recursive: true});
    await copyFile(path.join(root, file), destination);
  }
  return {output, files};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const {output, files} = await buildPublicSite(root);
  console.log(`Prepared ${files.length} public files in ${output}`);
}
