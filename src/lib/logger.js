import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * Verbose structured logger for DNS lookups, Nmap scans, banner grabs, and CVE lookups.
 * Writes to data/logs.json as an array of log entries.
 *
 * Each entry: { id, timestamp, category, level, message, detail, duration?, target?, scanId? }
 *
 * Categories: DNS, NMAP, BANNER, CVE
 * Levels: INFO, WARN, ERROR, DEBUG
 */

const MAX_LOGS = 5000; // Keep last 5000 entries

function getLogsPath() {
  const dataDir = process.env.DATA_DIR || './data';
  return path.resolve(dataDir, 'logs.json');
}

let logCounter = 0;

async function readLogs() {
  try {
    const raw = await readFile(getLogsPath(), 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    return [];
  }
}

async function writeLogs(logs) {
  const logsPath = getLogsPath();
  await mkdir(path.dirname(logsPath), { recursive: true });
  // Trim to MAX_LOGS
  const trimmed = logs.length > MAX_LOGS ? logs.slice(logs.length - MAX_LOGS) : logs;
  await writeFile(logsPath, JSON.stringify(trimmed, null, 2), 'utf-8');
}

export async function log(category, level, message, detail = {}) {
  const entry = {
    id: `${Date.now()}-${++logCounter}`,
    timestamp: new Date().toISOString(),
    category,    // DNS | NMAP | BANNER | CVE
    level,       // INFO | WARN | ERROR | DEBUG
    message,
    detail,
  };

  try {
    const logs = await readLogs();
    logs.push(entry);
    await writeLogs(logs);
  } catch {
    // Logging should never crash the app
  }

  return entry;
}

export async function getLogs({ category, level, limit = 200, offset = 0 } = {}) {
  let logs = await readLogs();

  // Filter by category (supports comma-separated: "DNS,NMAP")
  if (category) {
    const cats = category.split(',').map((c) => c.trim().toUpperCase());
    logs = logs.filter((l) => cats.includes(l.category));
  }

  // Filter by level
  if (level) {
    const levels = level.split(',').map((l) => l.trim().toUpperCase());
    logs = logs.filter((l) => levels.includes(l.level));
  }

  // Newest first
  logs.reverse();

  // Paginate
  const total = logs.length;
  const page = logs.slice(offset, offset + limit);

  return { logs: page, total };
}

// ── Convenience helpers ──

export function logDNS(level, message, detail = {}) {
  return log('DNS', level, message, detail);
}

export function logNMAP(level, message, detail = {}) {
  return log('NMAP', level, message, detail);
}

export function logBANNER(level, message, detail = {}) {
  return log('BANNER', level, message, detail);
}

export function logCVE(level, message, detail = {}) {
  return log('CVE', level, message, detail);
}
