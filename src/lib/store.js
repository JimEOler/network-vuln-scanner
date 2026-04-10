import { readFile, writeFile, mkdir, access } from 'fs/promises';
import path from 'path';

function getDataDir() {
  return process.env.DATA_DIR || './data';
}

function resolvePath(filename) {
  return path.resolve(getDataDir(), filename);
}

export async function readJSON(filename) {
  try {
    const filePath = resolvePath(filename);
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeJSON(filename, data) {
  const filePath = resolvePath(filename);
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = filePath + '.tmp';
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  // Clean up temp file
  try {
    const { unlink } = await import('fs/promises');
    await unlink(tmpPath);
  } catch {}
}

export async function hasUsers() {
  const users = await readJSON('users.json');
  return users !== null && Array.isArray(users) && users.length > 0;
}

export async function getUsers() {
  return (await readJSON('users.json')) || [];
}

export async function saveUsers(users) {
  await writeJSON('users.json', users);
}

export async function getAssets() {
  return (await readJSON('assets.json')) || [];
}

export async function saveAssets(assets) {
  await writeJSON('assets.json', assets);
}

export async function getSchedules() {
  return (await readJSON('schedules.json')) || [];
}

export async function saveSchedules(schedules) {
  await writeJSON('schedules.json', schedules);
}

export async function getScan(scanId) {
  return await readJSON(`scans/${scanId}.json`);
}

export async function saveScan(scanId, data) {
  await writeJSON(`scans/${scanId}.json`, data);
}

export async function listScans() {
  const { readdir } = await import('fs/promises');
  const scansDir = resolvePath('scans');
  try {
    const files = await readdir(scansDir);
    const scans = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const scan = await readJSON(`scans/${file}`);
        if (scan) scans.push(scan);
      }
    }
    return scans.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
