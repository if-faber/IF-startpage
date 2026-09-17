const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const net = require("net");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function loadEnvironmentFile(filename) {
  if (!fs.existsSync(filename)) return;

  const lines = fs.readFileSync(filename, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const APP_BASE_DIR = process.env.APP_BASE_DIR || path.join(__dirname, "..");
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(APP_BASE_DIR, "config");
const WWW_DIR = process.env.WWW_DIR || path.join(APP_BASE_DIR, "www");
const HELPER_DIR = process.env.HELPER_DIR || path.join(APP_BASE_DIR, "www-helper");

loadEnvironmentFile(process.env.DASHBOARD_ENV_FILE || path.join(CONFIG_DIR, "dashboard.env"));

const app = express();
const PORT = Number(process.env.PORT || 3010);

const DATA_FILE = process.env.DATA_FILE || path.join(CONFIG_DIR, "services.json");
const DASHBOARD_FILE = process.env.DASHBOARD_FILE || path.join(CONFIG_DIR, "dashboard.json");
const THEME_FILE = process.env.THEME_FILE || path.join(CONFIG_DIR, "theme.json");
const ADMIN_THEME_FILE = process.env.ADMIN_THEME_FILE || path.join(CONFIG_DIR, "admin-theme.json");
const KIOSK_FILE = process.env.KIOSK_FILE || path.join(CONFIG_DIR, "kiosk.json");
const DASHBOARD_LOGO_FILE = process.env.DASHBOARD_LOGO_FILE || path.join(WWW_DIR, "images", "dashboard-logo.png");
const DASHBOARD_BACKGROUND_FILE = process.env.DASHBOARD_BACKGROUND_FILE || path.join(WWW_DIR, "images", "background-custom.jpg");
const ADMIN_BACKGROUND_FILE = process.env.ADMIN_BACKGROUND_FILE || path.join(WWW_DIR, "images", "background-admin-custom.jpg");
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(HELPER_DIR, "backups");
let DASHBOARD_PIN = String(process.env.DASHBOARD_PIN || process.env.ADMIN_PIN || "1311");

// Katalog na hoście /home/gravi/docker/app zamontowany (do odczytu i zapisu compose.yaml
// innych stosów) pod tą ścieżką wewnątrz kontenera www-helper. Wymaga wolumenu
// "/home/gravi/docker/app:/host-apps" dodanego ręcznie w Dockge do serwisu www-helper.
const HOST_APPS_DIR = process.env.HOST_APPS_DIR || "/host-apps";

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.static(WWW_DIR, {
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
}));

app.get("/", (req, res) => {
  res.sendFile(path.join(WWW_DIR, "index.html"));
});

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ sections: [] }, null, 2), "utf8");
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function loadServices() {
  ensureDataFile();

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

    if (!data.sections || !Array.isArray(data.sections)) {
      return { sections: [] };
    }

    return data;
  } catch (error) {
    console.error("Load services error:", error);
    return { sections: [] };
  }
}

function backupServices() {
  ensureDataFile();

  if (!fs.existsSync(DATA_FILE)) return;

  const timestamp = new Date()
    .toISOString()
    .replaceAll(":", "-")
    .replaceAll(".", "-");

  const backupFile = path.join(BACKUP_DIR, `services-${timestamp}.json`);

  fs.copyFileSync(DATA_FILE, backupFile);

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter(file => file.endsWith(".json"))
    .sort()
    .reverse();

  backups.slice(20).forEach(file => {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
  });
}

function saveServices(data) {
  ensureDataFile();

  try {
    backupServices();
  } catch (error) {
    console.error("Backup error:", error);
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function createId() {
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function ensureConfigDir(filename) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadDashboardSettings() {
  ensureConfigDir(DASHBOARD_FILE);
  if (!fs.existsSync(DASHBOARD_FILE)) return {};

  try {
    const data = JSON.parse(fs.readFileSync(DASHBOARD_FILE, "utf8"));
    return sanitizeDashboardSettings(data);
  } catch (error) {
    console.error("Load dashboard settings error:", error);
    return {};
  }
}

function sanitizeDashboardSettings(input) {
  const allowed = ["title", "subtitle", "apiUrl", "defaultHost", "logo"];
  const output = {};

  for (const key of allowed) {
    const value = normalizeText(input?.[key]);
    if (value) output[key] = value;
  }

  return output;
}

function saveDashboardSettings(settings) {
  ensureConfigDir(DASHBOARD_FILE);
  fs.writeFileSync(DASHBOARD_FILE, JSON.stringify(sanitizeDashboardSettings(settings), null, 2), "utf8");
}

function sanitizeThemeSettings(input) {
  const allowed = ["accent", "accentAlt", "surfaceColor", "fontMenu", "fontCard", "fontDescription", "bg", "backgroundImage", "backgroundUrl", "backgroundBlur", "backgroundOpacity", "backgroundDim", "sidebarWidth", "sidebarPanelColor", "sidebarPanelAlpha", "sidebarToggleColor", "sidebarToggleSize", "titleSize", "titleColor", "titleShadowBlur", "subtitleSize", "subtitleColor", "subtitleShadowBlur", "pageTitleSize", "pageTitleShadowBlur", "cardRadius", "cardGap", "tileHeight", "logoSize", "panelColor", "panelAlpha", "glassBlur", "glassSaturation", "borderAlpha", "adminPanelColor", "adminPanelAlpha", "modalBg", "modalAlpha", "modalGlassBlur", "modalBackdropBlur", "modalBackdropAlpha", "modalRadius"];
  const output = {};

  for (const key of allowed) {
    const value = normalizeText(input?.[key]);
    if (value) output[key] = value;
  }

  return output;
}

function loadThemeSettings() {
  ensureConfigDir(THEME_FILE);
  if (!fs.existsSync(THEME_FILE)) return {};

  try {
    return sanitizeThemeSettings(JSON.parse(fs.readFileSync(THEME_FILE, "utf8")));
  } catch (error) {
    console.error("Load theme settings error:", error);
    return {};
  }
}

function saveThemeSettings(theme) {
  ensureConfigDir(THEME_FILE);
  fs.writeFileSync(THEME_FILE, JSON.stringify(sanitizeThemeSettings(theme), null, 2), "utf8");
}

function saveDashboardLogo(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    throw new Error("Niepoprawny format logo.");
  }

  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const targetFile = DASHBOARD_LOGO_FILE.replace(/\.[^.]+$/, `.${extension}`);
  ensureConfigDir(targetFile);
  fs.writeFileSync(targetFile, Buffer.from(match[2], "base64"));

  return `./images/${path.basename(targetFile)}?v=${Date.now()}`;
}

function saveDashboardBackground(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    throw new Error("Niepoprawny format obrazu tła.");
  }

  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const targetFile = DASHBOARD_BACKGROUND_FILE.replace(/\.[^.]+$/, `.${extension}`);
  ensureConfigDir(targetFile);
  fs.writeFileSync(targetFile, Buffer.from(match[2], "base64"));

  return `./images/${path.basename(targetFile)}?v=${Date.now()}`;
}

function saveAdminBackground(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    throw new Error("Niepoprawny format obrazu tła.");
  }

  const extension = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const targetFile = ADMIN_BACKGROUND_FILE.replace(/\.[^.]+$/, `.${extension}`);
  ensureConfigDir(targetFile);
  fs.writeFileSync(targetFile, Buffer.from(match[2], "base64"));

  return `/images/${path.basename(targetFile)}?v=${Date.now()}`;
}

function getDashboardPin() {
  const targetEnv = process.env.DASHBOARD_ENV_FILE || path.join(CONFIG_DIR, "dashboard.env");
  if (fs.existsSync(targetEnv)) {
    try {
      const content = fs.readFileSync(targetEnv, "utf8");
      const match = content.match(/^DASHBOARD_PIN=(.*)$/m);
      if (match && match[1].trim()) return match[1].trim();
    } catch {}
  }
  return String(process.env.DASHBOARD_PIN || process.env.ADMIN_PIN || "1311").trim();
}

function saveDashboardPin(pin) {
  const cleanPin = String(pin).replace(/\r?\n/g, "").trim();
  const targetEnv = process.env.DASHBOARD_ENV_FILE || path.join(CONFIG_DIR, "dashboard.env");
  ensureConfigDir(targetEnv);
  fs.writeFileSync(
    targetEnv,
    `DASHBOARD_PIN=${cleanPin}\n`,
    "utf8"
  );
  process.env.DASHBOARD_PIN = cleanPin;
}

function hasValidPin(req) {
  const provided = String(req.body?.pin || req.get("x-admin-pin") || "").trim();
  if (!provided) return false;
  const currentPin = getDashboardPin();
  return provided === currentPin;
}

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function checkTcpPort(host, port, timeoutMs = 1500) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let finished = false;

    function finish(result) {
      if (finished) return;

      finished = true;
      socket.destroy();
      resolve(result);
    }

    socket.setTimeout(timeoutMs);

    socket.once("connect", () => {
      finish({
        ok: true,
        status: "busy",
        open: true,
        busy: true,
        message: `Port ${port} jest zajęty. Coś odpowiada na ${host}:${port}.`
      });
    });

    socket.once("timeout", () => {
      finish({
        ok: true,
        status: "unknown",
        open: null,
        busy: null,
        message: `Nie udało się jednoznacznie sprawdzić ${host}:${port}. Timeout.`
      });
    });

    socket.once("error", () => {
      finish({
        ok: true,
        status: "free",
        open: false,
        busy: false,
        message: `Port ${port} wygląda na wolny na hoście ${host}.`
      });
    });

    socket.connect(port, host);
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(5000)
  });
  const data = await response.json();

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// ─── Sprawdzanie wersji obrazów Docker (tylko wersje stabilne) ────────────────

// Kontenery pomijane przy sprawdzaniu wersji (np. myhome buduje się z własnego
// prywatnego rejestru Gitea, więc "najnowsza wersja" nie ma tu zastosowania).
const DOCKER_VERSION_EXCLUDE = new Set(["myhome"]);

// Wyjątki, gdy nazwa kontenera nie pokrywa się z nazwą folderu stosu i/lub
// kluczem serwisu w compose.yaml (konwencja domyślna: stack === service === nazwa kontenera).
const DOCKER_STACK_OVERRIDES = {
  wordpress_db: { stack: "wordpress", service: "db" }
};

function resolveStackAndService(containerName) {
  return DOCKER_STACK_OVERRIDES[containerName] || { stack: containerName, service: containerName };
}

const UNSTABLE_TAG_HINTS = /(alpha|beta|rc\d*|dev|nightly|edge|preview|snapshot|canary|insider|unstable|master|testing)/i;
const STABLE_TAG_RE = /^v?\d+(\.\d+){0,3}$/;

function isStableTag(tag) {
  if (!tag || tag === "latest") return false;
  if (UNSTABLE_TAG_HINTS.test(tag)) return false;
  return STABLE_TAG_RE.test(tag);
}

function compareVersionTags(a, b) {
  const partsA = String(a).replace(/^v/, "").split(".").map(Number);
  const partsB = String(b).replace(/^v/, "").split(".").map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseImageRef(image) {
  const clean = String(image).split("@")[0]; // odetnij ewentualny digest (@sha256:...)

  // Tag odcinamy tylko z ostatniego segmentu ścieżki, żeby nie pomylić portu
  // hosta rejestru (np. "localhost:3000/...") z separatorem taga.
  const lastSlashIdx = clean.lastIndexOf("/");
  const lastSegment = lastSlashIdx === -1 ? clean : clean.slice(lastSlashIdx + 1);
  const nameWithoutTag = lastSegment.includes(":")
    ? clean.slice(0, lastSlashIdx + 1) + lastSegment.split(":")[0]
    : clean;

  const segments = nameWithoutTag.split("/");
  const looksLikeHost = segments.length >= 2 && (segments[0].includes(".") || segments[0].includes(":") || segments[0] === "localhost");

  if (looksLikeHost) {
    return { host: segments[0], repository: segments.slice(1).join("/") };
  }

  const repository = segments.length === 1 ? `library/${segments[0]}` : nameWithoutTag;
  return { host: null, repository };
}

async function fetchDockerHubStableTag(repository) {
  const url = `https://hub.docker.com/v2/repositories/${repository}/tags?page_size=100&ordering=last_updated`;
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`Docker Hub HTTP ${response.status}`);
  const data = await response.json();
  const tags = (data.results || []).map(t => t.name).filter(isStableTag);
  tags.sort(compareVersionTags);
  return tags.length ? tags[tags.length - 1] : null;
}

async function fetchOciRegistryToken(host, repository) {
  const pingRes = await fetch(`https://${host}/v2/`, { signal: AbortSignal.timeout(5000) });
  if (pingRes.status === 200) return null;

  const authHeader = pingRes.headers.get("www-authenticate") || "";
  const realmMatch = authHeader.match(/realm="([^"]+)"/);
  const serviceMatch = authHeader.match(/service="([^"]+)"/);
  if (!realmMatch) return null;

  const tokenUrl = new URL(realmMatch[1]);
  if (serviceMatch) tokenUrl.searchParams.set("service", serviceMatch[1]);
  tokenUrl.searchParams.set("scope", `repository:${repository}:pull`);

  const tokenRes = await fetch(tokenUrl.toString(), { signal: AbortSignal.timeout(5000) });
  if (!tokenRes.ok) return null;
  const tokenData = await tokenRes.json();
  return tokenData.token || tokenData.access_token || null;
}

async function fetchOciStableTag(host, repository) {
  const token = await fetchOciRegistryToken(host, repository);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`https://${host}/v2/${repository}/tags/list`, {
    headers,
    signal: AbortSignal.timeout(6000)
  });
  if (!res.ok) throw new Error(`Registry HTTP ${res.status}`);
  const data = await res.json();
  const tags = (data.tags || []).filter(isStableTag);
  tags.sort(compareVersionTags);
  return tags.length ? tags[tags.length - 1] : null;
}

async function fetchLatestStableTag(image) {
  const { host, repository } = parseImageRef(image);
  try {
    if (host) return await fetchOciStableTag(host, repository);
    return await fetchDockerHubStableTag(repository);
  } catch (error) {
    console.error(`Sprawdzanie najnowszej wersji nie powiodło się dla ${image}:`, error.message);
    return null;
  }
}

async function getInstalledVersionLabel(containerName) {
  try {
    const { stdout } = await execFileAsync("docker", [
      "inspect", containerName,
      "--format", '{{index .Config.Labels "org.opencontainers.image.version"}}'
    ], { timeout: 3000 });
    const label = stdout.trim();
    return label && label !== "<no value>" ? label : null;
  } catch {
    return null;
  }
}

function readAllCoresStat() {
  try {
    const content = fs.readFileSync("/proc/stat", "utf8");
    const lines = content.split(/\r?\n/);
    const cores = {};
    for (const line of lines) {
      const match = line.match(/^(cpu\d*)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (match) {
        const id = match[1];
        const user = Number(match[2]);
        const nice = Number(match[3]);
        const system = Number(match[4]);
        const idle = Number(match[5]);
        const iowait = Number(match[6]);
        const irq = Number(match[7]);
        const softirq = Number(match[8]);
        const total = user + nice + system + idle + iowait + irq + softirq;
        const idleTotal = idle + iowait;
        cores[id] = { idle: idleTotal, total };
      }
    }
    return cores;
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readCpuUsage() {
  try {
    const first = readAllCoresStat();
    await delay(140);
    const second = readAllCoresStat();
    if (!first || !second || !first.cpu || !second.cpu) return null;
    const total = second.cpu.total - first.cpu.total;
    const idle = second.cpu.idle - first.cpu.idle;
    if (total <= 0) return null;
    return Math.max(0, Math.min(100, ((total - idle) / total) * 100));
  } catch {
    return null;
  }
}

async function readPerCoreCpuUsage() {
  try {
    const first = readAllCoresStat();
    await delay(140);
    const second = readAllCoresStat();
    if (!first || !second) return [];

    const keys = Object.keys(second)
      .filter((k) => /^cpu\d+$/.test(k))
      .sort((a, b) => Number(a.replace("cpu", "")) - Number(b.replace("cpu", "")));

    const results = [];
    for (const key of keys) {
      const f = first[key];
      const s = second[key];
      if (f && s) {
        const totalDelta = s.total - f.total;
        const idleDelta = s.idle - f.idle;
        const usage = totalDelta > 0
          ? Math.max(0, Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100))
          : 0;
        const coreIndex = Number(key.replace("cpu", ""));
        results.push({
          core: coreIndex,
          name: `Core ${coreIndex}`,
          usage: Math.round(usage * 10) / 10
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

function readMemInfo() {
  const output = fs.readFileSync("/proc/meminfo", "utf8");
  const data = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s+(\d+)/);
    if (match) data[match[1]] = Number(match[2]) * 1024;
  }
  const memoryTotal = data.MemTotal || 0;
  const memoryFree = data.MemFree || 0;
  const memoryAvailable = data.MemAvailable ?? memoryFree;
  const buffers = data.Buffers || 0;
  const cached = data.Cached || 0;
  const sReclaimable = data.SReclaimable || 0;
  const cacheTotal = buffers + cached + sReclaimable;
  const memoryUsed = Math.max(0, memoryTotal - memoryAvailable);

  const swapTotal = data.SwapTotal || 0;
  const swapFree = data.SwapFree || 0;
  const swapUsed = Math.max(0, swapTotal - swapFree);

  return {
    memory: {
      total: memoryTotal,
      free: memoryFree,
      available: memoryAvailable,
      cache: cacheTotal,
      buffers,
      cached,
      used: memoryUsed,
      percent: memoryTotal ? (memoryUsed / memoryTotal) * 100 : null
    },
    swap: {
      total: swapTotal,
      available: swapFree,
      used: swapUsed,
      percent: swapTotal ? (swapUsed / swapTotal) * 100 : null
    }
  };
}

function readTemperature() {
  const candidates = [];
  for (const base of ["/sys/class/thermal", "/sys/class/hwmon"]) {
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base)) {
      const dir = path.join(base, entry);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const file of fs.readdirSync(dir)) {
        if (/^temp\d*_input$/.test(file) || file === "temp") {
          candidates.push(path.join(dir, file));
        }
      }
    }
  }

  for (const file of candidates) {
    try {
      const raw = Number(fs.readFileSync(file, "utf8").trim());
      if (!Number.isFinite(raw) || raw <= 0) continue;
      const value = raw > 1000 ? raw / 1000 : raw;
      if (value > 0 && value < 130) return value;
    } catch {
      // Try next sensor.
    }
  }
  return null;
}

function readCoreTemperatures() {
  const coreTemps = {};
  let packageTemp = null;
  try {
    const hwmonDir = "/sys/class/hwmon";
    if (fs.existsSync(hwmonDir)) {
      for (const entry of fs.readdirSync(hwmonDir)) {
        const dir = path.join(hwmonDir, entry);
        let name = "";
        try { name = fs.readFileSync(path.join(dir, "name"), "utf8").trim(); } catch {}
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const match = file.match(/^temp(\d+)_input$/);
          if (match) {
            const idx = match[1];
            let label = "";
            try { label = fs.readFileSync(path.join(dir, `temp${idx}_label`), "utf8").trim(); } catch {}
            const raw = Number(fs.readFileSync(path.join(dir, file), "utf8").trim());
            if (Number.isFinite(raw) && raw > 0) {
              const temp = raw > 1000 ? raw / 1000 : raw;
              if (temp > 0 && temp < 130) {
                if (/Package/i.test(label) || /pkg/i.test(label)) {
                  packageTemp = temp;
                } else if (/Core\s*(\d+)/i.test(label)) {
                  const coreNum = label.match(/Core\s*(\d+)/i)[1];
                  coreTemps[coreNum] = temp;
                } else if (/coretemp/i.test(name)) {
                  if (idx === "1" && !packageTemp) packageTemp = temp;
                  else if (Number(idx) > 1) {
                    const cNum = String(Number(idx) - 2);
                    if (!coreTemps[cNum]) coreTemps[cNum] = temp;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch {}
  return { packageTemp: packageTemp || readTemperature(), coreTemps };
}

let lastNetSample = null;

function readNetDev() {
  try {
    const content = fs.readFileSync("/proc/net/dev", "utf8");
    const lines = content.split(/\r?\n/);
    let rxTotal = 0;
    let txTotal = 0;
    const interfaces = [];
    for (const line of lines) {
      const parts = line.trim().split(/[:\s]+/);
      if (parts.length >= 10 && !line.includes("Inter-|") && !line.includes("face |")) {
        const iface = parts[0];
        if (iface === "lo") continue;
        const rxBytes = Number(parts[1]) || 0;
        const txBytes = Number(parts[9]) || 0;
        rxTotal += rxBytes;
        txTotal += txBytes;
        interfaces.push({ iface, rxBytes, txBytes });
      }
    }
    return { timestamp: Date.now(), rxTotal, txTotal, interfaces };
  } catch {
    return null;
  }
}

async function getNetworkSpeed() {
  const current = readNetDev();
  if (!current) return { rxSpeed: 0, txSpeed: 0, rxTotal: 0, txTotal: 0, interfaces: [] };

  if (!lastNetSample) {
    lastNetSample = current;
    await delay(150);
    const next = readNetDev();
    if (!next) return { rxSpeed: 0, txSpeed: 0, rxTotal: current.rxTotal, txTotal: current.txTotal, interfaces: current.interfaces };
    const dt = (next.timestamp - current.timestamp) / 1000 || 0.15;
    const rxSpeed = Math.max(0, (next.rxTotal - current.rxTotal) / dt);
    const txSpeed = Math.max(0, (next.txTotal - current.txTotal) / dt);
    lastNetSample = next;
    return { rxSpeed, txSpeed, rxTotal: next.rxTotal, txTotal: next.txTotal, interfaces: next.interfaces };
  }

  const dt = (current.timestamp - lastNetSample.timestamp) / 1000;
  const rxSpeed = dt > 0 ? Math.max(0, (current.rxTotal - lastNetSample.rxTotal) / dt) : 0;
  const txSpeed = dt > 0 ? Math.max(0, (current.txTotal - lastNetSample.txTotal) / dt) : 0;
  lastNetSample = current;
  return { rxSpeed, txSpeed, rxTotal: current.rxTotal, txTotal: current.txTotal, interfaces: current.interfaces };
}

function formatMountName(target) {
  if (target === "/" || target === "/host/root") return "/ (Dysk główny)";
  if (target.startsWith("/host/mnt/")) return target.replace("/host/mnt/", "/mnt/");
  return target || "—";
}

async function readDisks() {
  try {
    const { stdout } = await execFileAsync("df", ["-k", "-P"], { timeout: 3000 });
    const lines = stdout.trim().split(/\r?\n/).slice(1);
    const seenFs = new Set();
    const disks = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6) continue;
      const filesystem = parts[0];
      const total = Number(parts[1]) * 1024;
      const used = Number(parts[2]) * 1024;
      const available = Number(parts[3]) * 1024;
      const percent = Number(String(parts[4]).replace("%", ""));
      const mount = parts[5];

      if (!total || total <= 0) continue;
      // Pomiń pseudopartytycje i wirtualne systemy plików
      if (filesystem === "tmpfs" || filesystem === "shm" || filesystem === "devtmpfs") continue;
      if (mount.startsWith("/proc") || mount.startsWith("/sys") || mount.startsWith("/dev") || mount.startsWith("/run")) continue;
      
      // Pomiń wewnętrzne montowania kontenera Docker (/app/*, /etc/*)
      if (mount.startsWith("/app/") || mount.startsWith("/etc/")) continue;
      
      // Deduplikacja wg urządzenia (aby ten sam dysk nie powtarzał się wielokrotnie)
      const fsKey = filesystem.startsWith("/dev/") ? filesystem : mount;
      if (seenFs.has(fsKey)) continue;
      seenFs.add(fsKey);

      disks.push({
        filesystem,
        mount: formatMountName(mount),
        total,
        used,
        available,
        percent
      });
    }
    return disks;
  } catch {
    return [];
  }
}

async function readTopProcesses() {
  const processes = [];
  try {
    const { stdout } = await execFileAsync("top", ["-b", "-n", "1"], { timeout: 2000 });
    const lines = stdout.trim().split(/\r?\n/);
    let headerFound = false;
    for (const line of lines) {
      if (/PID\s+PPID/i.test(line) || /PID\s+USER/i.test(line)) {
        headerFound = true;
        continue;
      }
      if (headerFound && line.trim()) {
        const cols = line.trim().split(/\s+/);
        if (cols.length >= 7) {
          const pid = cols[0];
          const user = cols[2] || cols[1];
          const memPerc = cols[5];
          const cpuPerc = cols[7] || cols[6];
          const comm = cols.slice(8).join(" ") || cols[cols.length - 1];
          processes.push({
            pid: Number(pid) || pid,
            user,
            cpu: Number(String(cpuPerc).replace("%", "")) || 0,
            mem: Number(String(memPerc).replace("%", "")) || 0,
            command: comm
          });
        }
      }
    }
  } catch {}

  let containers = [];
  try {
    const { stdout } = await execFileAsync("docker", [
      "stats",
      "--no-stream",
      "--format",
      '{"name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","pids":"{{.PIDs}}"}'
    ], { timeout: 3000 });
    containers = stdout
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch {}

  return { processes: processes.slice(0, 15), containers };
}

async function loadSystemStats() {
  const [cpuUsage, disks] = await Promise.all([readCpuUsage(), readDisks()]);
  const memory = readMemInfo();
  const load = os.loadavg();
  return {
    updated: new Date().toISOString(),
    cpu: {
      count: os.cpus().length,
      usage: cpuUsage,
      load1: load[0],
      load5: load[1],
      load15: load[2],
      temperature: readTemperature()
    },
    ...memory,
    disks
  };
}

async function loadSystemTopStats() {
  const [coresCpu, disks, netSpeed, topData] = await Promise.all([
    readPerCoreCpuUsage(),
    readDisks(),
    getNetworkSpeed(),
    readTopProcesses()
  ]);
  const memory = readMemInfo();
  const temperatures = readCoreTemperatures();
  const load = os.loadavg();
  const uptime = os.uptime();

  const cores = coresCpu.map((c) => ({
    ...c,
    temperature: temperatures.coreTemps[String(c.core)] ?? temperatures.packageTemp ?? null
  }));

  const cpuOverall = {
    count: os.cpus().length,
    load1: load[0],
    load5: load[1],
    load15: load[2],
    packageTemp: temperatures.packageTemp,
    cores
  };

  return {
    updated: new Date().toISOString(),
    uptime,
    cpu: cpuOverall,
    memory: memory.memory,
    swap: memory.swap,
    network: netSpeed,
    disks,
    processes: topData.processes,
    containers: topData.containers
  };
}

app.get("/api/services", (req, res) => {
  res.json(loadServices());
});

app.post("/api/admin/unlock", (req, res) => {
  if (!hasValidPin(req)) {
    return res.status(403).json({ error: "Niepoprawny PIN" });
  }

  res.json({ success: true });
});

app.get("/api/dashboard/settings", (req, res) => {
  res.json({ settings: loadDashboardSettings() });
});

app.put("/api/dashboard/settings", (req, res) => {
  if (!hasValidPin(req)) {
    return res.status(403).json({ error: "Niepoprawny PIN" });
  }

  const settings = sanitizeDashboardSettings(req.body || {});
  const newPin = normalizeText(req.body?.newPin);
  const logoData = normalizeText(req.body?.logoData);

  if (logoData) {
    settings.logo = saveDashboardLogo(logoData);
  }

  saveDashboardSettings(settings);
  if (newPin) saveDashboardPin(newPin);

  res.json({ success: true, settings });
});

app.get("/api/dashboard/theme", (req, res) => {
  res.json({ theme: loadThemeSettings() });
});

app.put("/api/dashboard/theme", (req, res) => {
  if (!hasValidPin(req)) {
    return res.status(403).json({ error: "Niepoprawny PIN" });
  }

  const theme = req.body?.reset ? {} : sanitizeThemeSettings(req.body || {});
  const backgroundData = normalizeText(req.body?.backgroundData);
  if (!req.body?.reset && backgroundData) {
    theme.backgroundImage = "custom";
    theme.backgroundUrl = saveDashboardBackground(backgroundData);
  }
  saveThemeSettings(theme);

  res.json({ success: true, theme });
});

function loadAdminTheme() {
  ensureConfigDir(ADMIN_THEME_FILE);
  if (!fs.existsSync(ADMIN_THEME_FILE)) return { theme: {}, mode: "night" };
  try {
    return JSON.parse(fs.readFileSync(ADMIN_THEME_FILE, "utf8"));
  } catch (error) {
    return { theme: {}, mode: "night" };
  }
}

function saveAdminTheme(data) {
  ensureConfigDir(ADMIN_THEME_FILE);
  fs.writeFileSync(ADMIN_THEME_FILE, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/admin/theme", (req, res) => {
  res.json(loadAdminTheme());
});

app.put("/api/admin/theme", (req, res) => {
  if (!hasValidPin(req)) {
    return res.status(403).json({ error: "Niepoprawny PIN" });
  }
  const theme = req.body?.reset ? {} : (req.body?.themeSettings || req.body?.theme || req.body || {});
  const backgroundData = normalizeText(req.body?.backgroundData);
  if (!req.body?.reset && backgroundData) {
    theme.backgroundImage = "custom";
    theme.backgroundUrl = saveAdminBackground(backgroundData);
  }
  saveAdminTheme({ theme });
  res.json({ success: true, theme });
});

app.get("/api/admin/theme-data", (req, res) => {
  res.json(loadAdminTheme());
});

app.post("/api/admin/theme-data", (req, res) => {
  if (!hasValidPin(req)) return res.status(403).json({ error: "Brak autoryzacji" });
  saveAdminTheme(req.body || {});
  res.json({ success: true });
});

// --- Ustawienia Kiosku (www/kiosk/) — podstawowe ustawienia, motyw i przyciski menu ---

const KIOSK_MENU_ITEM_TYPES = new Set(["iframe", "link", "server-status", "live", "docker-status"]);

function sanitizeKioskSettings(input) {
  const output = {};
  const idleTimeout = Number(input?.idleTimeout);
  if (Number.isFinite(idleTimeout) && idleTimeout >= 0) output.idleTimeout = idleTimeout;
  return output;
}

function sanitizeKioskTheme(input) {
  const allowed = [
    "fontScale",
    "notchBg", "notchText", "notchBorder", "notchGlow", "notchBlur", "notchOpacity",
    "lollipopBg", "lollipopBlur", "lollipopOpacity", "lollipopSat",
    "btnBg", "btnText", "btnHoverBg", "btnHoverText", "btnActiveBg", "btnActiveText"
  ];
  const output = {};
  for (const key of allowed) {
    const value = normalizeText(input?.[key]);
    if (value) output[key] = value;
  }
  return output;
}

function sanitizeKioskMenuItems(input) {
  if (!Array.isArray(input)) return null;
  return input
    .filter((raw) => raw && typeof raw === "object" && normalizeText(raw.title))
    .map((raw, idx) => ({
      id: normalizeText(raw.id) || `item-${Date.now()}-${idx}`,
      title: normalizeText(raw.title),
      type: KIOSK_MENU_ITEM_TYPES.has(raw.type) ? raw.type : "iframe",
      url: normalizeText(raw.url),
      icon: normalizeText(raw.icon)
    }));
}

function loadKioskSettings() {
  ensureConfigDir(KIOSK_FILE);
  if (!fs.existsSync(KIOSK_FILE)) {
    return { settings: {}, theme: {}, menuItems: [] };
  }
  try {
    const data = JSON.parse(fs.readFileSync(KIOSK_FILE, "utf8"));
    return {
      settings: sanitizeKioskSettings(data.settings || {}),
      theme: sanitizeKioskTheme(data.theme || {}),
      menuItems: sanitizeKioskMenuItems(data.menuItems) || []
    };
  } catch (error) {
    console.error("Load kiosk settings error:", error);
    return { settings: {}, theme: {}, menuItems: [] };
  }
}

function saveKioskSettings(data) {
  ensureConfigDir(KIOSK_FILE);
  const payload = {
    settings: sanitizeKioskSettings(data.settings || {}),
    theme: sanitizeKioskTheme(data.theme || {}),
    menuItems: sanitizeKioskMenuItems(data.menuItems) || []
  };
  fs.writeFileSync(KIOSK_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

app.get("/api/kiosk/settings", (req, res) => {
  res.json(loadKioskSettings());
});

app.put("/api/kiosk/settings", (req, res) => {
  if (!hasValidPin(req)) {
    return res.status(403).json({ error: "Niepoprawny PIN" });
  }

  const current = loadKioskSettings();
  const merged = {
    settings: { ...current.settings, ...sanitizeKioskSettings(req.body?.settings || {}) },
    theme: { ...current.theme, ...sanitizeKioskTheme(req.body?.theme || {}) },
    menuItems: Array.isArray(req.body?.menuItems) ? req.body.menuItems : current.menuItems
  };

  const saved = saveKioskSettings(merged);
  res.json({ success: true, ...saved });
});

app.post("/api/services/section", (req, res) => {
  const data = loadServices();
  const name = normalizeText(req.body.name);

  if (!name) {
    return res.status(400).json({ error: "Brak nazwy sekcji" });
  }

  const section = {
    id: createId(),
    name,
    groups: [
      {
        name: "Linki",
        items: []
      }
    ]
  };

  data.sections.push(section);
  saveServices(data);

  res.json({ success: true, section });
});

app.put("/api/services/section/:id", (req, res) => {
  const data = loadServices();
  const section = data.sections.find(item => item.id === req.params.id);
  const name = normalizeText(req.body.name);

  if (!section) {
    return res.status(404).json({ error: "Sekcja nie istnieje" });
  }

  if (!name) {
    return res.status(400).json({ error: "Brak nazwy sekcji" });
  }

  section.name = name;
  saveServices(data);

  res.json({ success: true, section });
});

app.put("/api/services/section/:id/move", (req, res) => {
  const data = loadServices();
  const sectionIndex = data.sections.findIndex(section => section.id === req.params.id);
  const direction = normalizeText(req.body.direction);

  if (sectionIndex === -1) {
    return res.status(404).json({ error: "Sekcja nie istnieje" });
  }

  if (!["up", "down"].includes(direction)) {
    return res.status(400).json({ error: "Niepoprawny kierunek" });
  }

  const targetIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;

  if (targetIndex < 0 || targetIndex >= data.sections.length) {
    return res.json({ success: true, sections: data.sections });
  }

  [data.sections[sectionIndex], data.sections[targetIndex]] = [
    data.sections[targetIndex],
    data.sections[sectionIndex]
  ];
  saveServices(data);

  res.json({ success: true, sections: data.sections });
});

app.put("/api/services/link/:id/move", (req, res) => {
  const data = loadServices();
  const linkId = req.params.id;
  const direction = normalizeText(req.body.direction);

  if (!["up", "down"].includes(direction)) {
    return res.status(400).json({ error: "Niepoprawny kierunek (dozwolone: up, down)" });
  }

  let found = false;
  for (const section of (data.sections || [])) {
    if (!Array.isArray(section.groups)) continue;
    for (const group of section.groups) {
      if (!Array.isArray(group.items)) continue;
      const index = group.items.findIndex(item => item.id === linkId);
      if (index !== -1) {
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < group.items.length) {
          [group.items[index], group.items[targetIndex]] = [
            group.items[targetIndex],
            group.items[index]
          ];
          saveServices(data);
        }
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    return res.status(404).json({ error: "Link nie istnieje" });
  }

  res.json({ success: true, sections: data.sections });
});

app.post("/api/services/link", (req, res) => {
  const data = loadServices();

  const sectionId = normalizeText(req.body.sectionId);
  const name = normalizeText(req.body.name);
  const url = normalizeText(req.body.url);
  const icon = normalizeText(req.body.icon);
  const description = normalizeText(req.body.description);

  if (!sectionId || !name || !url) {
    return res.status(400).json({ error: "Brakuje danych linku" });
  }

  const section = data.sections.find(item => item.id === sectionId);

  if (!section) {
    return res.status(404).json({ error: "Sekcja nie istnieje" });
  }

  if (!Array.isArray(section.groups)) {
    section.groups = [];
  }

  let group = section.groups.find(item => item.name === "Linki");

  if (!group) {
    group = {
      name: "Linki",
      items: []
    };

    section.groups.push(group);
  }

  group.items.push({
    id: createId(),
    name,
    description,
    icon,
    url,
    kind: "link"
  });

  saveServices(data);

  res.json({ success: true });
});

app.put("/api/services/link/:id", (req, res) => {
  const data = loadServices();

  const linkId = req.params.id;
  const sectionId = normalizeText(req.body.sectionId);
  const name = normalizeText(req.body.name);
  const url = normalizeText(req.body.url);
  const icon = normalizeText(req.body.icon);
  const description = normalizeText(req.body.description);

  if (!sectionId || !name || !url) {
    return res.status(400).json({ error: "Brakuje danych linku" });
  }

  let foundLink = null;

  data.sections.forEach(section => {
    if (!Array.isArray(section.groups)) return;

    section.groups.forEach(group => {
      if (!Array.isArray(group.items)) return;

      const index = group.items.findIndex(item => item.id === linkId);

      if (index !== -1) {
        foundLink = group.items[index];
        group.items.splice(index, 1);
      }
    });
  });

  if (!foundLink) {
    return res.status(404).json({ error: "Link nie istnieje" });
  }

  const targetSection = data.sections.find(section => section.id === sectionId);

  if (!targetSection) {
    return res.status(404).json({ error: "Sekcja nie istnieje" });
  }

  if (!Array.isArray(targetSection.groups)) {
    targetSection.groups = [];
  }

  let targetGroup = targetSection.groups.find(group => group.name === "Linki");

  if (!targetGroup) {
    targetGroup = {
      name: "Linki",
      items: []
    };

    targetSection.groups.push(targetGroup);
  }

  targetGroup.items.push({
    id: linkId,
    name,
    description,
    icon,
    url,
    kind: "link"
  });

  saveServices(data);

  res.json({ success: true });
});

app.delete("/api/services/section/:id", (req, res) => {
  const data = loadServices();

  data.sections = data.sections.filter(section => section.id !== req.params.id);

  saveServices(data);

  res.json({ success: true });
});

app.delete("/api/services/link/:id", (req, res) => {
  const data = loadServices();

  data.sections.forEach(section => {
    if (!Array.isArray(section.groups)) return;

    section.groups.forEach(group => {
      if (!Array.isArray(group.items)) return;

      group.items = group.items.filter(item => item.id !== req.params.id);
    });
  });

  saveServices(data);

  res.json({ success: true });
});

app.post("/api/ports/check", async (req, res) => {
  const host = normalizeText(req.body.host);
  const port = Number(req.body.port);

  if (!host || !isValidPort(port)) {
    return res.status(400).json({
      ok: false,
      status: "invalid-data",
      message: "Brakuje hosta albo poprawnego portu z zakresu 1-65535."
    });
  }

  try {
    const result = await checkTcpPort(host, port);

    return res.json({
      ...result,
      host,
      port
    });
  } catch (error) {
    console.error("Port check error:", error);

    return res.status(500).json({
      ok: false,
      status: "check-error",
      host,
      port,
      message: "Nie udało się sprawdzić portu."
    });
  }
});

app.get("/api/system/stats", async (req, res) => {
  try {
    const stats = await loadSystemStats();
    res.set("cache-control", "no-store");
    return res.json({ ok: true, ...stats });
  } catch (error) {
    console.error("System stats error:", error.message);
    return res.status(500).json({
      ok: false,
      message: "Nie udało się pobrać statystyk systemu."
    });
  }
});

app.get("/api/system/top", async (req, res) => {
  try {
    const stats = await loadSystemTopStats();
    res.set("cache-control", "no-store");
    return res.json({ ok: true, ...stats });
  } catch (error) {
    console.error("System top stats error:", error.message);
    return res.status(500).json({
      ok: false,
      message: "Nie udało się pobrać szczegółowych statystyk systemu."
    });
  }
});

app.get("/api/docker/containers", async (req, res) => {
  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "-a",
      "--format",
      '{"id":"{{.ID}}","name":"{{.Names}}","state":"{{.State}}","status":"{{.Status}}"}'
    ], { timeout: 4000 });
    const containers = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
    res.set("cache-control", "no-store");
    return res.json({ ok: true, containers });
  } catch (error) {
    return res.status(500).json({ ok: false, containers: [], message: error.message });
  }
});

app.get("/api/docker/versions", async (req, res) => {
  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "--format",
      '{"name":"{{.Names}}","image":"{{.Image}}"}'
    ], { timeout: 4000 });

    const running = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean)
      .filter((c) => !DOCKER_VERSION_EXCLUDE.has(c.name));

    const versions = await Promise.all(running.map(async (c) => {
      const { stack, service } = resolveStackAndService(c.name);
      const installedTag = c.image.includes(":") ? c.image.split(":").pop() : "latest";

      const [installedLabel, latestStable] = await Promise.all([
        getInstalledVersionLabel(c.name),
        fetchLatestStableTag(c.image)
      ]);

      return {
        container: c.name,
        stack,
        service,
        image: c.image,
        installedTag,
        installedVersion: installedLabel || (isStableTag(installedTag) ? installedTag : null),
        latestStable
      };
    }));

    res.set("cache-control", "no-store");
    res.json({ ok: true, versions });
  } catch (error) {
    res.status(500).json({ ok: false, versions: [], message: error.message });
  }
});

app.post("/api/docker/update-compose", (req, res) => {
  if (!hasValidPin(req)) {
    return res.status(403).json({ ok: false, message: "Niepoprawny PIN" });
  }

  try {
    const container = normalizeText(req.body?.container);
    const newTag = normalizeText(req.body?.tag);

    if (DOCKER_VERSION_EXCLUDE.has(container)) {
      return res.status(400).json({ ok: false, message: "Ten kontener jest wykluczony z aktualizacji przez ten panel." });
    }

    if (!newTag || !isStableTag(newTag)) {
      return res.status(400).json({ ok: false, message: "Niepoprawny numer wersji." });
    }

    const { stack, service } = resolveStackAndService(container);
    const composePath = path.join(HOST_APPS_DIR, stack, "compose.yaml");

    if (!fs.existsSync(composePath)) {
      return res.status(404).json({
        ok: false,
        message: `Nie znaleziono ${composePath}. Sprawdź, czy w Dockge dodano wolumen "/home/gravi/docker/app:/host-apps" do serwisu www-helper.`
      });
    }

    const original = fs.readFileSync(composePath, "utf8");
    const lines = original.split(/\r?\n/);

    let inTargetService = false;
    let serviceIndent = null;
    let updated = false;

    const newLines = lines.map((line) => {
      const serviceMatch = line.match(/^(\s\s)(\S[^:]*):\s*$/);
      if (serviceMatch) {
        inTargetService = serviceMatch[2] === service;
        serviceIndent = serviceMatch[1].length;
        return line;
      }

      if (inTargetService) {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch[1].length;

        if (line.trim() && indent <= serviceIndent) {
          inTargetService = false;
        } else {
          const imageMatch = line.match(/^(\s*image:\s*)(\S+)(\s*)$/);
          if (imageMatch) {
            const repo = imageMatch[2].split(":")[0];
            updated = true;
            return `${imageMatch[1]}${repo}:${newTag}${imageMatch[3]}`;
          }
        }
      }

      return line;
    });

    if (!updated) {
      return res.status(404).json({
        ok: false,
        message: `Nie znaleziono linii "image:" dla serwisu "${service}" w ${stack}/compose.yaml.`
      });
    }

    fs.copyFileSync(composePath, `${composePath}.bak-${Date.now()}`);
    fs.writeFileSync(composePath, newLines.join("\n"), "utf8");

    res.json({
      ok: true,
      message: `Zapisano tag "${newTag}" w ${stack}/compose.yaml (serwis "${service}"). Restart stosu w Dockge, żeby zastosować zmianę.`
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/api/docker/container/:name/logs", async (req, res) => {
  try {
    const name = String(req.params.name).replaceAll(/[^a-zA-Z0-9_.-]/g, "");
    const { stdout, stderr } = await execFileAsync("docker", [
      "logs",
      "--tail",
      "150",
      name
    ], { timeout: 5000 });
    res.set("cache-control", "no-store");
    return res.json({ ok: true, logs: (stdout || stderr || "Brak logów.").trim() });
  } catch (error) {
    return res.status(500).json({ ok: false, logs: `Błąd odczytu logów: ${error.message}` });
  }
});

app.get("/api/alerts/summary", async (req, res) => {
  try {
    const alerts = [];
    let containers = [];
    let dockerOk = true;

    // 1. Kontenery Docker
    try {
      const { stdout } = await execFileAsync("docker", [
        "ps",
        "-a",
        "--format",
        '{"id":"{{.ID}}","name":"{{.Names}}","state":"{{.State}}","status":"{{.Status}}"}'
      ], { timeout: 4000 });
      containers = stdout
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);

      for (const c of containers) {
        const stateLower = String(c.state || "").toLowerCase();
        const statusLower = String(c.status || "").toLowerCase();
        if (stateLower !== "running" || statusLower.includes("unhealthy") || statusLower.includes("dead") || statusLower.includes("restart")) {
          let severity = "critical";
          if (stateLower === "paused" || statusLower.includes("health: starting")) {
            severity = "warning";
          }
          alerts.push({
            id: `docker-${c.id || c.name}`,
            type: "docker",
            severity,
            title: `Kontener: ${c.name}`,
            message: `Stan: ${c.state || "nieznany"} (${c.status || "brak statusu"})`,
            resource: c.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (dockerErr) {
      dockerOk = false;
      alerts.push({
        id: "docker-daemon-error",
        type: "system",
        severity: "warning",
        title: "Docker Daemon niedostępny",
        message: `Błąd komunikacji z Dockerem: ${dockerErr.message}`,
        resource: "docker",
        timestamp: new Date().toISOString()
      });
    }

    // 2. Hardware / System
    try {
      const stats = await loadSystemStats();
      const temp = stats.cpu?.temperature;
      if (temp != null && temp >= 78) {
        alerts.push({
          id: "hw-cpu-temp",
          type: "hardware",
          severity: temp >= 85 ? "critical" : "warning",
          title: "Wysoka temperatura procesora",
          message: `Temperatura CPU wynosi ${Math.round(temp)}°C`,
          resource: "cpu",
          timestamp: new Date().toISOString()
        });
      }

      const memPct = stats.memory?.percent;
      if (memPct != null && memPct >= 95) {
        alerts.push({
          id: "hw-ram-high",
          type: "hardware",
          severity: "warning",
          title: "Wysokie zużycie pamięci RAM",
          message: `Zajętość pamięci RAM wynosi ${Math.round(memPct)}%`,
          resource: "ram",
          timestamp: new Date().toISOString()
        });
      }

      const disks = Array.isArray(stats.disks) ? stats.disks : [];
      for (const d of disks) {
        const diskPct = Number(d.percent || d.use || 0);
        if (diskPct >= 90) {
          alerts.push({
            id: `hw-disk-${d.mount || d.filesystem}`,
            type: "hardware",
            severity: diskPct >= 95 ? "critical" : "warning",
            title: `Brak miejsca na dysku (${d.mount || d.filesystem})`,
            message: `Zajętość partycji wynosi ${diskPct}% (${d.used || ""} / ${d.size || ""})`,
            resource: d.mount || "disk",
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (statsErr) {
      console.error("Alerts summary stats error:", statsErr);
    }

    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;

    res.set("cache-control", "no-store");
    return res.json({
      ok: true,
      summary: {
        total: alerts.length,
        critical: criticalCount,
        warning: warningCount,
        healthy: alerts.length === 0,
        containersTotal: containers.length,
        containersRunning: containers.filter((c) => c.state === "running").length,
        timestamp: new Date().toISOString()
      },
      alerts
    });
  } catch (error) {
    console.error("Alerts summary error:", error);
    return res.status(500).json({
      ok: false,
      summary: { total: 1, critical: 1, warning: 0, healthy: false },
      alerts: [{
        id: "internal-error",
        type: "system",
        severity: "critical",
        title: "Błąd modułu alertów",
        message: error.message,
        timestamp: new Date().toISOString()
      }]
    });
  }
});

app.get("/api/system/updates", async (req, res) => {
  try {
    let packages = [];
    try {
      const { stdout } = await execFileAsync("apt", ["list", "--upgradable"], {
        env: { ...process.env, LANG: "C", LC_ALL: "C" },
        timeout: 15000
      });
      packages = stdout
        .split("\n")
        .filter(line => line.includes("/") && line.includes("[upgradable"))
        .map(line => {
          const parts = line.split(" ");
          const namePart = parts[0] || "";
          const name = namePart.split("/")[0];
          const newVersion = parts[1] || "";
          const archPart = parts[2] || "";
          return { name, newVersion, arch: archPart };
        })
        .filter(p => p.name);
    } catch {
      // apt niedostępne (np. kontener bez apt) — zwróć pustą listę
    }
    res.json({ ok: true, count: packages.length, packages });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, count: 0, packages: [] });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`WWW Helper running on port ${PORT}`);
});
