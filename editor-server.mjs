import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const defaultContentPath = path.join(root, 'content.json');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
};

function assertObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
}

function assertString(value, name) {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`);
  }
}

function validateActions(actions, name) {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error(`${name}.actions must contain at least one button`);
  }
  actions.forEach((action, index) => {
    assertObject(action, `${name}.actions[${index}]`);
    assertString(action.label, `${name}.actions[${index}].label`);
    assertString(action.url, `${name}.actions[${index}].url`);
  });
}

function validateItems(section, key) {
  assertObject(section, key);
  assertString(section.title, `${key}.title`);
  if (!Array.isArray(section.items)) {
    throw new Error(`${key}.items must be an array`);
  }
  section.items.forEach((item, index) => {
    const name = `${key}.items[${index}]`;
    assertObject(item, name);
    assertString(item.title, `${name}.title`);
    assertString(item.description, `${name}.description`);
    validateActions(item.actions, name);
  });
}

export function validateContent(content) {
  assertObject(content, 'content');
  assertString(content.pageTitle, 'pageTitle');
  assertObject(content.assets, 'assets');
  assertString(content.assets.avatar, 'assets.avatar');
  assertString(content.assets.background, 'assets.background');
  assertString(content.assets.secretTrack, 'assets.secretTrack');

  assertObject(content.profile, 'profile');
  assertString(content.profile.title, 'profile.title');
  assertString(content.profile.subtitle, 'profile.subtitle');
  assertString(content.profile.greeting, 'profile.greeting');
  if (!Array.isArray(content.profile.paragraphs) || content.profile.paragraphs.length === 0) {
    throw new Error('profile.paragraphs must contain at least one paragraph');
  }

  validateItems(content.tutorials, 'tutorials');
  validateItems(content.plugins, 'plugins');
  validateItems(content.bots, 'bots');

  assertObject(content.secret, 'secret');
  assertString(content.secret.title, 'secret.title');
  assertString(content.secret.subtitle, 'secret.subtitle');
  assertString(content.secret.label, 'secret.label');
  assertString(content.secret.trackTitle, 'secret.trackTitle');
  assertString(content.secret.backLabel, 'secret.backLabel');
  if (!Number.isInteger(content.secret.unlockTaps) || content.secret.unlockTaps < 1) {
    throw new Error('secret.unlockTaps must be a positive integer');
  }
}

export async function saveContentToPath(filePath, content) {
  validateContent(content);
  await writeFile(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error('Request body is too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(response, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

async function serveStatic(request, response) {
  const url = new URL(request.url, 'http://localhost');
  const requestedPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    send(response, 403, 'Forbidden');
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      send(response, 404, 'Not found');
      return;
    }
    const body = await readFile(filePath);
    send(response, 200, body, mimeTypes[path.extname(filePath)] || 'application/octet-stream');
  } catch {
    send(response, 404, 'Not found');
  }
}

export function createEditorServer({ contentPath = defaultContentPath } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');

      if (url.pathname === '/api/content' && request.method === 'GET') {
        send(response, 200, await readFile(contentPath, 'utf8'), 'application/json; charset=utf-8');
        return;
      }

      if (url.pathname === '/api/content' && request.method === 'POST') {
        const body = await readRequestBody(request);
        await saveContentToPath(contentPath, JSON.parse(body));
        send(response, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
        return;
      }

      if (request.method === 'GET' || request.method === 'HEAD') {
        await serveStatic(request, response);
        return;
      }

      send(response, 405, 'Method not allowed');
    } catch (error) {
      send(response, 400, JSON.stringify({ ok: false, error: error.message }), 'application/json; charset=utf-8');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8088);
  const server = createEditorServer();
  server.listen(port, () => {
    console.log(`Local editor is running at http://localhost:${port}/editor.html`);
    console.log(`Preview is running at http://localhost:${port}/index.html`);
  });
}
