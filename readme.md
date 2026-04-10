# Network Vulnerability Scanner

A web-based network vulnerability scanning dashboard for security professionals and network administrators. Automates port scanning, service banner analysis, and CVE correlation — surfaced through a real-time React/Next.js frontend. All data is persisted to local JSON files; no database required.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 15 (App Router) |
| Styling | Tailwind CSS 4 |
| Language | JavaScript (ES2022+) |
| Scanning Backend | Node.js child_process → nmap |
| Banner Grabbing | Node.js `net` / `tls` sockets |
| CVE Lookup | Exploit-DB API + NVD REST API v2 |
| Auth | File-based (bcrypt-hashed credentials in `data/users.json`) |
| Storage | JSON flat files under `/data` |
| Package Manager | npm |

---

## Prerequisites

- Node.js `>= 20.x` (includes npm)
- `nmap` installed on the host system
- Write access to the `/data` directory

### Install nmap

```bash
# Debian / Ubuntu
sudo apt install nmap

# macOS
brew install nmap

# Windows — download installer from https://nmap.org/download.html
# Ensure nmap.exe is on PATH
```

---

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/stratix/network-vuln-scanner.git
cd network-vuln-scanner

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.example .env.local

# 4. Start dev server
npm run dev
```

On **first launch**, the app detects no existing `data/users.json` and redirects to `/setup` — a one-time prompt to create the initial admin user ID and password.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | ✅ | Secret key used to sign session cookies (min 32 chars) |
| `DATA_DIR` | ✅ | Absolute path to the flat-file data directory |
| `NMAP_PATH` | ❌ | Override path to nmap binary (default: `nmap` on PATH) |
| `NVD_API_KEY` | ❌ | NVD REST API key — increases rate limits significantly |
| `EXPLOIT_DB_BASE_URL` | ❌ | Override Exploit-DB base URL (default: `https://www.exploit-db.com`) |
| `NODE_ENV` | ✅ | `development` / `production` |
| `PORT` | ❌ | Port for the Next.js server (default: `3000`) |

---

## Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Production build
npm start            # Start production server
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier
npm test             # Jest unit tests
npm run test:watch   # Jest in watch mode
```

---

## Application Tabs

### Assets (Tab 1)
Define scan targets. An asset can be:
- Single IP: `192.168.1.10`
- CIDR range: `192.168.1.0/24`
- Hostname: `fileserver.corp.local`

All asset changes prompt a **save confirmation** before navigating away.

### Scheduling (Tab 2)
Select one or more assets and configure recurring or one-time scan schedules. Supports cron-style recurrence. Schedule state is persisted to `data/schedules.json`.

### Settings (Gear Icon ⚙️)
- **Change Password** — re-authenticate then set new password
- **Appearance** — Toggle Light / Dark mode (default: Dark)
- **Nmap Path Override** — point to a custom nmap binary
- **Notification Preferences** — (roadmap)

---

## Data Files

All files live under `DATA_DIR` (configured in `.env.local`):

```
data/
  users.json          # Hashed credentials
  assets.json         # Asset definitions
  schedules.json      # Scan schedules
  scans/
    <scan-id>.json    # Individual scan results
  audit.log           # Auth and scan audit trail
```

---

## Default Behavior

- **Theme**: Dark mode on first load; preference stored in `localStorage`
- **Unsaved changes**: Any tab with pending edits shows a save prompt on navigation or browser close (`beforeunload`)
- **Session**: Cookie-based, expires after 8 hours of inactivity

---

## License

Internal use only — Stratix Corporation. Not for redistribution.
