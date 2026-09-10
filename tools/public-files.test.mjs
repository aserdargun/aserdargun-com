import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPublicSite, isPublicFile } from './public-files.mjs';

test('public file boundary permits public routes and rejects internal and ambiguous paths', () => {
  for (const file of ['index.html','tr/index.html','tr/applications/index.html','now/archive/2026-W34/index.html','images/career/08-ai-engineer.webp','fonts/inter-var-latin.woff2','schemas/aserdargun-app.schema.json']) assert.equal(isPublicFile(file),true,file);
  for (const file of ['.git/config','data/private-applications.json','tools/serve.mjs','package.json','README.md','projects/stage-1-frontend-foundations/index.html','tr/.env','images/.private/photo.png','images/../index.html','/index.html','images/secret.json','images/config.js','tr//index.html','tr\\index.html']) assert.equal(isPublicFile(file),false,file);
});

test('artifact excludes private files and symlinks, preserves public bytes, and removes stale output', async t => {
  const root = await mkdtemp(path.join(tmpdir(),'public-artifact-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const fixtures = {'index.html':'<main>Public</main>','tr/index.html':'<main>Türkçe</main>','images/public.svg':'<svg/>','data/private-applications.json':'private fixture','images/.private/hidden.svg':'private fixture','images/source.js':'internal source','.site-dist/stale.txt':'stale'};
  for (const [file, content] of Object.entries(fixtures)) {await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),content);}
  await symlink(path.join(root,'data/private-applications.json'),path.join(root,'images/private.svg'));
  const artifact = await buildPublicSite(root);
  assert.deepEqual(artifact.files,['images/public.svg','index.html','tr/index.html']);
  for (const file of artifact.files) assert.equal(await readFile(path.join(artifact.output,file),'utf8'),fixtures[file]);
  for (const file of ['images/private.svg','images/source.js','images/.private/hidden.svg','data/private-applications.json','stale.txt']) await assert.rejects(stat(path.join(artifact.output,file)),{code:'ENOENT'});
});
