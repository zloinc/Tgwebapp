import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { saveContentToPath, validateContent } from '../editor-server.mjs';

const root = path.resolve(import.meta.dirname, '..');

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

test('content.json contains the editable page content', async () => {
  const content = await readJson(path.join(root, 'content.json'));

  assert.doesNotThrow(() => validateContent(content));
  assert.equal(content.profile.title, "TG:ipoStas'ь 👻");
  assert.ok(content.profile.paragraphs.length >= 3);
  assert.ok(content.profile.paragraphs.every((paragraph) => !/[<>]/.test(paragraph)));
  assert.ok(content.tutorials.items.length >= 9);
  assert.ok(content.plugins.items.some((item) => item.title === '🎚️ Lazy Levels Pro'));
  assert.ok(content.bots.items.some((item) => item.title === 'RS Render Bot'));
});

test('local editor save writes valid content and rejects broken content', async () => {
  const source = await readJson(path.join(root, 'content.json'));
  const tempDir = await mkdtemp(path.join(tmpdir(), 'tgwebapp-content-'));
  const target = path.join(tempDir, 'content.json');

  try {
    const updated = structuredClone(source);
    updated.plugins.items.push({
      title: 'Test Plugin',
      tag: 'After Effects',
      tagTone: 'blue',
      description: 'Temporary test item',
      actions: [{ label: 'OPEN', url: 'https://example.com', style: 'primary' }],
    });

    await saveContentToPath(target, updated);
    const saved = await readJson(target);
    assert.equal(saved.plugins.items.at(-1).title, 'Test Plugin');

    const broken = structuredClone(source);
    delete broken.tutorials;
    await assert.rejects(() => saveContentToPath(target, broken), /tutorials/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('index and editor pages are wired to the editable content flow', async () => {
  const indexHtml = await readFile(path.join(root, 'index.html'), 'utf8');
  const editorHtml = await readFile(path.join(root, 'editor.html'), 'utf8');

  assert.match(indexHtml, /content\.json/);
  assert.match(indexHtml, /app\.js/);
  assert.match(editorHtml, /\/api\/content/);
  assert.match(editorHtml, /editor\.js/);
});
