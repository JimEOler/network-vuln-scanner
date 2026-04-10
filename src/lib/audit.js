import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

function getAuditPath() {
  const dataDir = process.env.DATA_DIR || './data';
  return path.resolve(dataDir, 'audit.log');
}

export async function logAudit(event, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };

  const logPath = getAuditPath();
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, JSON.stringify(entry) + '\n', 'utf-8');
}
