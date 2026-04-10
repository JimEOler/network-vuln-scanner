# Network Vulnerability Scanner

> **v1.2.0** — Stratix Design System, Domain DNS Lookups, Multi-Record Resolution

A web-based network vulnerability scanning dashboard for security professionals and network administrators. Automates port scanning, service banner analysis, and CVE correlation — surfaced through a real-time React/Next.js frontend. All data is persisted to local JSON files; no database required.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 15 (App Router) |
| Styling | Tailwind CSS 4, Stratix Design System |
| Typography | SF Pro Display / SF Pro Text (optical sizing) |
| Language | JavaScript (ES2022+) |
| Scanning Backend | Node.js child_process → nmap |
| DNS Resolution | `dig` with `nslookup` fallback (A, CNAME, MX records) |
| Banner Grabbing | Node.js `net` / `tls` sockets |
| CVE Lookup | Exploit-DB API + NVD REST API v2 |
| Auth | File-based (bcrypt-hashed credentials in `data/users.json`) |
| Sessions | JWT via `jose`, signed HTTP-only cookies (8hr expiry) |
| Storage | JSON flat files under `/data` |
| Package Manager | npm |

---

## Prerequisites

- Node.js `>= 20.x` (includes npm)
- `nmap` installed on the host system
- `dig` or `nslookup` available for domain resolution
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
| `SESSION_SECRET` | Yes | Secret key used to sign session cookies (min 32 chars) |
| `DATA_DIR` | Yes | Absolute path to the flat-file data directory |
| `NMAP_PATH` | No | Override path to nmap binary (default: `nmap` on PATH) |
| `NVD_API_KEY` | No | NVD REST API key — increases rate limits significantly |
| `EXPLOIT_DB_BASE_URL` | No | Override Exploit-DB base URL (default: `https://www.exploit-db.com`) |
| `NODE_ENV` | Yes | `development` / `production` |
| `PORT` | No | Port for the Next.js server (default: `3000`) |

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
- **Single IP**: `192.168.1.10`
- **CIDR range**: `192.168.1.0/24`
- **Hostname**: `fileserver.corp.local`
- **Domain** (new in v1.2): `example.com` — performs a DNS lookup via `dig` (with `nslookup` fallback) and resolves **A**, **CNAME**, and **MX** records. All resolved hosts are automatically added as assets:
  - A records are added as IP assets
  - CNAME records are added as hostname assets
  - MX records are added as hostname assets
  - Duplicate targets are skipped

All asset changes prompt a **save confirmation** before navigating away.

### Scheduling (Tab 2)
Select one or more assets and configure recurring or one-time scan schedules. Supports cron-style recurrence with preset shortcuts (hourly, daily, weekdays, weekly, monthly). Schedule state is persisted to `data/schedules.json`. Each schedule has an enable/disable toggle and a "Run Now" button.

### Scan Results (Tab 3)
View completed and in-progress vulnerability scans. Each scan shows:
- Summary cards: hosts scanned, open ports, CVEs found
- Expandable host results with per-port detail
- Service banners (TCP/TLS)
- CVE listings with severity scores (CRITICAL, HIGH, MEDIUM, LOW)
- Auto-polls every 10 seconds for running scans

### Settings (Gear Icon)
- **Appearance** — Toggle Light / Dark mode (default: Dark)
- **Change Password** — re-authenticate then set new password
- **Nmap Path Override** — point to a custom nmap binary
- **Notification Preferences** — (roadmap)

---

## Design System

The UI follows the **Stratix Design System** — adapted from Apple's design philosophy for enterprise IT.

### Colors
- **Dark theme**: Pure black (`#000000`) surfaces, `#252527` cards
- **Light theme**: Cool gray (`#F2F4F7`) surfaces, white cards
- **Single accent**: Stratix Blue (`#0057B8`) — the only chromatic color, reserved exclusively for interactive elements
- **Links**: `#3B9EFF` on dark backgrounds, `#004EA3` on light

### Typography
- **SF Pro Display** at 20px and above — headlines with tight line-heights (1.07-1.19)
- **SF Pro Text** below 20px — body, captions, micro text
- Negative letter-spacing at all sizes for tight, efficient text
- Falls back to system fonts (-apple-system, Helvetica Neue, Arial)

### Key Components
- **Glass navigation bar** — translucent dark (`rgba(0,0,0,0.80)`) with `backdrop-filter: saturate(180%) blur(20px)`
- **Buttons** — 8px radius, Stratix Blue primary CTAs
- **Pill CTAs** — 980px radius for secondary actions
- **Cards** — 8px radius, no visible borders, minimal shadow
- **Modals** — 12px radius with soft card shadow

### Layout
- Max content width: 980px, centered
- Cinematic spacing between sections
- Reveal-on-hover action buttons for asset/schedule rows

---

## Data Files

All files live under `DATA_DIR` (configured in `.env.local`):

```
data/
  users.json          # Hashed credentials
  assets.json         # Asset definitions (IP, CIDR, hostname, domain)
  schedules.json      # Scan schedules
  scans/
    <scan-id>.json    # Individual scan results
  audit.log           # Auth and scan audit trail
```

---

## Project Structure

```
src/
  app/
    globals.css              # Stratix Design System tokens & typography
    layout.js                # Root layout with ThemeProvider
    page.js                  # Redirect to /assets or /login
    login/page.js            # Login page
    setup/page.js            # First-launch admin setup
    (dashboard)/
      layout.js              # Authenticated shell (glass nav + tabs)
      assets/page.js         # Assets CRUD with domain resolution
      scheduling/page.js     # Schedule management
      scans/page.js          # Scan results viewer
      settings/page.js       # Settings page
    api/
      auth/                  # setup, login, logout, change-password
      assets/                # CRUD + resolve-domain endpoint
      schedules/             # CRUD
      scans/                 # list, detail, run
  lib/
    store.js                 # JSON file read/write
    auth.js                  # bcrypt + JWT sessions
    audit.js                 # Append-only audit log
    scanner.js               # Nmap child_process wrapper
    banner.js                # TCP/TLS banner grabbing
    cve.js                   # NVD + Exploit-DB API client
    dns.js                   # dig/nslookup resolver (A, CNAME, MX)
    scheduler.js             # Cron evaluation
  components/
    Header.js                # Glass navigation bar
    TabNav.js                # Tab navigation
    ThemeProvider.js          # Dark/light theme context
    Modal.js                 # Modal dialog
    SavePrompt.js            # Unsaved changes prompt
    AssetForm.js             # Asset creation/edit form
    ScheduleForm.js          # Schedule creation/edit form
    ScanResults.js           # Scan results display
    SettingsPanel.js         # Settings controls
  middleware.js              # Route protection (JWT verification)
```

---

## Default Behavior

- **Theme**: Dark mode on first load; preference stored in `localStorage`
- **Unsaved changes**: Any tab with pending edits shows a save prompt on navigation or browser close (`beforeunload`)
- **Session**: Cookie-based JWT, expires after 8 hours of inactivity
- **Domain resolution**: Tries `dig` first for parallel A/CNAME/MX queries, falls back to `nslookup` if dig is unavailable

---

## Changelog

### v1.2.0
- Added **Domain** target type with DNS resolution (A, CNAME, MX records)
- DNS lookups use `dig` with automatic `nslookup` fallback
- Resolved hosts are auto-added as IP or hostname assets
- Applied **Stratix Design System** across the entire UI
- Glass navigation bar with backdrop blur
- SF Pro Display/Text typography with optical sizing
- Stratix Blue (`#0057B8`) as single accent color
- Pure black / cool gray section alternation
- Pill-shaped CTAs and 980px max content width
- Reveal-on-hover action buttons

### v1.0.0
- Initial release
- Port scanning via nmap with service version detection
- TCP/TLS banner grabbing
- CVE correlation via NVD REST API v2
- File-based auth with bcrypt and JWT sessions
- Assets, Scheduling, Scan Results, and Settings tabs
- Dark/light theme toggle
- JSON flat-file persistence
- Audit logging

---

## License

Internal use only — Stratix Corporation. Not for redistribution.
