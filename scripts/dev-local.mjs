#!/usr/bin/env node
// ===========================================
// DORA - Local Development Orchestrator
// Inicia todos os serviços sem Docker
// Cross-platform (Windows, Linux, macOS)
// ===========================================

import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { platform } from "node:os";

const ROOT = resolve(import.meta.dirname, "..");
const LOCAL_DIR = join(ROOT, "local-services");
const IS_WIN = platform() === "win32";
const isCI = process.env.CI === "true";

// Colors for terminal
const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const services = [];
let shuttingDown = false;

function log(service, msg, color = c.gray) {
  const ts = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  const padded = service.padEnd(15);
  console.log(`${c.gray}${ts}${c.reset} ${color}${padded}${c.reset} ${msg}`);
}

function startService(name, cmd, args, opts = {}) {
  const env = { ...process.env, ...opts.env };
  const cwd = opts.cwd || ROOT;

  log(name, `Iniciando: ${cmd} ${args.join(" ")}`, c.cyan);

  const proc = spawn(cmd, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: IS_WIN,
    detached: false,
  });

  proc.stdout?.on("data", (d) => {
    for (const line of d.toString().split("\n").filter(Boolean)) {
      log(name, line);
    }
  });

  proc.stderr?.on("data", (d) => {
    for (const line of d.toString().split("\n").filter(Boolean)) {
      log(name, line, c.yellow);
    }
  });

  proc.on("exit", (code) => {
    if (!shuttingDown) {
      log(name, `Processo encerrou com código ${code}`, code ? c.red : c.green);
    }
  });

  services.push({ name, proc });
  return proc;
}

async function waitForService(name, checkFn, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await checkFn()) {
        log(name, "Pronto!", c.green);
        return true;
      }
    } catch {}
    await sleep(1500);
  }
  log(name, "Timeout esperando serviço ficar pronto", c.red);
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function httpCheck(url) {
  try {
    const res = await fetch(url);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function tcpCheck(port) {
  const { createConnection } = await import("node:net");
  return new Promise((resolve) => {
    const sock = createConnection({ port, host: "127.0.0.1" }, () => {
      sock.end();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.setTimeout(1000, () => {
      sock.destroy();
      resolve(false);
    });
  });
}

// -----------------------------------------------
// Infrastructure Services
// -----------------------------------------------

function startPostgres() {
  const pgDir = join(LOCAL_DIR, "pgsql");
  const pgData = join(LOCAL_DIR, "pgdata");
  const pgBin = join(pgDir, "bin");

  if (IS_WIN && existsSync(join(pgBin, "pg_ctl.exe"))) {
    // Create user and database if needed
    startService("postgres", join(pgBin, "pg_ctl.exe"), [
      "start",
      "-D", pgData,
      "-l", join(LOCAL_DIR, "pg.log"),
      "-w",
    ]);
    return sleep(3000).then(async () => {
      try {
        execSync(
          `"${join(pgBin, "psql.exe")}" -U dora -d postgres -c "SELECT 1 FROM pg_database WHERE datname='dora'" | findstr "1"`,
          { stdio: "pipe" }
        );
      } catch {
        log("postgres", "Criando banco 'dora'...", c.cyan);
        try {
          execSync(
            `"${join(pgBin, "createdb.exe")}" -U dora dora`,
            { stdio: "pipe" }
          );
        } catch {}
      }
    });
  } else {
    // Assume PostgreSQL is installed system-wide (Linux/macOS/winget)
    log("postgres", "Usando PostgreSQL do sistema (porta 5432)", c.yellow);
  }
}

function startRedis() {
  const redisExe = IS_WIN
    ? join(LOCAL_DIR, "redis", "redis-server.exe")
    : "redis-server";

  if (IS_WIN && !existsSync(redisExe)) {
    log("redis", "redis-server não encontrado. Rode: npm run local:setup", c.red);
    return;
  }

  startService("redis", redisExe, ["--port", "6379", "--save", "60", "1"]);
}

function startElasticsearch() {
  const esVersionDir = existsSync(join(LOCAL_DIR, "elasticsearch-8.17.0"))
    ? join(LOCAL_DIR, "elasticsearch-8.17.0")
    : join(LOCAL_DIR, "elasticsearch");

  const esBat = IS_WIN
    ? join(esVersionDir, "bin", "elasticsearch.bat")
    : join(esVersionDir, "bin", "elasticsearch");

  if (!existsSync(esBat)) {
    log("elasticsearch", "Não encontrado. Rode: npm run local:setup", c.red);
    return;
  }

  startService("elasticsearch", esBat, [], {
    env: {
      ES_JAVA_OPTS: "-Xms512m -Xmx512m",
      "xpack.security.enabled": "false",
    },
  });
}

function startQdrant() {
  const qdrantExe = IS_WIN
    ? join(LOCAL_DIR, "qdrant", "qdrant.exe")
    : join(LOCAL_DIR, "qdrant", "qdrant");

  if (!existsSync(qdrantExe)) {
    log("qdrant", "Não encontrado. Rode: npm run local:setup", c.red);
    return;
  }

  startService("qdrant", qdrantExe, [], {
    cwd: join(LOCAL_DIR, "qdrant"),
  });
}

function startMinio() {
  const minioExe = IS_WIN
    ? join(LOCAL_DIR, "minio", "minio.exe")
    : join(LOCAL_DIR, "minio", "minio");

  if (!existsSync(minioExe)) {
    log("minio", "Não encontrado. Rode: npm run local:setup", c.red);
    return;
  }

  const dataDir = join(LOCAL_DIR, "minio", "data");
  mkdirSync(dataDir, { recursive: true });

  startService("minio", minioExe, [
    "server", dataDir,
    "--console-address", ":9001",
  ], {
    env: {
      MINIO_ROOT_USER: process.env.MINIO_ACCESS_KEY || "dora_minio",
      MINIO_ROOT_PASSWORD: process.env.MINIO_SECRET_KEY || "dora_minio_secret",
    },
  });
}

// -----------------------------------------------
// Initialize services (buckets, indices)
// -----------------------------------------------

async function initElasticsearch() {
  const esUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

  const indexDefs = {
    "dora-atos": {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            portuguese_custom: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "portuguese_stop", "portuguese_stemmer", "asciifolding"],
            },
          },
          filter: {
            portuguese_stop: { type: "stop", stopwords: "_portuguese_" },
            portuguese_stemmer: { type: "stemmer", language: "portuguese" },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: "keyword" },
          fonte_id: { type: "keyword" },
          edicao_id: { type: "keyword" },
          tipo: { type: "keyword" },
          titulo: {
            type: "text",
            analyzer: "portuguese_custom",
            fields: { keyword: { type: "keyword", ignore_above: 512 } },
          },
          ementa: { type: "text", analyzer: "portuguese_custom" },
          conteudo: { type: "text", analyzer: "portuguese_custom" },
          orgao: {
            type: "text",
            analyzer: "portuguese_custom",
            fields: { keyword: { type: "keyword", ignore_above: 256 } },
          },
          numero: { type: "keyword" },
          data_publicacao: { type: "date" },
          url_original: { type: "keyword" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    },
    "dora-edicoes": {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          id: { type: "keyword" },
          fonte_id: { type: "keyword" },
          numero: { type: "keyword" },
          data_publicacao: { type: "date" },
          url_original: { type: "keyword" },
          status: { type: "keyword" },
          total_atos: { type: "integer" },
          created_at: { type: "date" },
          updated_at: { type: "date" },
        },
      },
    },
  };

  for (const [name, body] of Object.entries(indexDefs)) {
    try {
      const check = await fetch(`${esUrl}/${name}`);
      if (check.ok) {
        log("es-init", `Índice '${name}' já existe`, c.yellow);
        continue;
      }
    } catch {}
    try {
      const res = await fetch(`${esUrl}/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) log("es-init", `Índice '${name}' criado`, c.green);
      else log("es-init", `Erro criando '${name}': ${res.status}`, c.red);
    } catch (e) {
      log("es-init", `Erro criando '${name}': ${e.message}`, c.red);
    }
  }
}

async function initMinio() {
  const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
  const minioPort = process.env.MINIO_PORT || "9000";
  const bucket = process.env.MINIO_BUCKET || "dora-documents";
  const accessKey = process.env.MINIO_ACCESS_KEY || "dora_minio";
  const secretKey = process.env.MINIO_SECRET_KEY || "dora_minio_secret";

  const mcExe = IS_WIN
    ? join(LOCAL_DIR, "minio", "mc.exe")
    : "mc";

  if (IS_WIN && !existsSync(mcExe)) {
    log("minio-init", "mc.exe não encontrado, pulando init", c.yellow);
    return;
  }

  try {
    execSync(
      `"${mcExe}" alias set dora http://${minioEndpoint}:${minioPort} ${accessKey} ${secretKey}`,
      { stdio: "pipe" }
    );
    try {
      execSync(`"${mcExe}" ls dora/${bucket}`, { stdio: "pipe" });
      log("minio-init", `Bucket '${bucket}' já existe`, c.yellow);
    } catch {
      execSync(`"${mcExe}" mb dora/${bucket}`, { stdio: "pipe" });
      execSync(`"${mcExe}" anonymous set download dora/${bucket}`, { stdio: "pipe" });
      log("minio-init", `Bucket '${bucket}' criado`, c.green);
    }
  } catch (e) {
    log("minio-init", `Erro: ${e.message}`, c.red);
  }
}

// -----------------------------------------------
// App Services
// -----------------------------------------------

function startApp() {
  const npx = IS_WIN ? "npx.cmd" : "npx";

  // API
  startService("api", npx, ["tsx", "watch", "src/index.ts"], {
    cwd: join(ROOT, "apps", "api"),
    env: { NODE_ENV: "development" },
  });

  // Web
  startService("web", npx, ["next", "dev", "--port", "3000"], {
    cwd: join(ROOT, "apps", "web"),
    env: { NODE_ENV: "development" },
  });

  // Processing Worker
  startService("worker-proc", npx, [
    "tsx", "watch", "src/workers/processing-worker.ts",
  ], {
    cwd: join(ROOT, "packages", "processor"),
    env: { NODE_ENV: "development" },
  });

  // Scraping Worker
  startService("worker-scrap", npx, [
    "tsx", "watch", "src/workers/scraping-worker.ts",
  ], {
    cwd: join(ROOT, "packages", "processor"),
    env: { NODE_ENV: "development" },
  });
}

// -----------------------------------------------
// Shutdown
// -----------------------------------------------

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${c.yellow}Encerrando todos os serviços...${c.reset}`);

  for (const { name, proc } of services.reverse()) {
    try {
      if (IS_WIN) {
        // Windows: taskkill for tree
        try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: "pipe" }); } catch {}
      } else {
        proc.kill("SIGTERM");
      }
      log(name, "Encerrado", c.yellow);
    } catch {}
  }

  // Stop PostgreSQL gracefully
  if (IS_WIN) {
    const pgCtl = join(LOCAL_DIR, "pgsql", "bin", "pg_ctl.exe");
    const pgData = join(LOCAL_DIR, "pgdata");
    if (existsSync(pgCtl)) {
      try { execSync(`"${pgCtl}" stop -D "${pgData}" -m fast`, { stdio: "pipe" }); } catch {}
    }
  }

  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);

// -----------------------------------------------
// Main
// -----------------------------------------------

async function main() {
  console.log(`
${c.cyan}╔═══════════════════════════════════════════╗
║  DORA - Desenvolvimento Local (sem Docker) ║
╚═══════════════════════════════════════════╝${c.reset}
`);

  const mode = process.argv[2] || "all";

  // Setup mode: run platform-specific install script
  if (mode === "setup") {
    log("setup", "Executando script de setup da plataforma...", c.cyan);
    if (IS_WIN) {
      execSync(
        `powershell -ExecutionPolicy Bypass -File "${join(ROOT, "scripts", "setup-local.ps1")}"`,
        { cwd: ROOT, stdio: "inherit" }
      );
    } else {
      execSync(`bash "${join(ROOT, "scripts", "setup-local.sh")}"`, {
        cwd: ROOT,
        stdio: "inherit",
      });
    }
    log("setup", "Setup concluído! Rode: npm run local:start", c.green);
    process.exit(0);
  }

  if (mode === "infra" || mode === "all") {
    // Start infrastructure
    startPostgres();
    startRedis();
    startElasticsearch();
    startQdrant();
    startMinio();

    // Wait for services
    log("startup", "Aguardando infraestrutura...", c.cyan);
    await Promise.all([
      waitForService("postgres", () => tcpCheck(5432), 30000),
      waitForService("redis", () => tcpCheck(6379), 15000),
      waitForService("elasticsearch", () => httpCheck("http://localhost:9200"), 60000),
      waitForService("qdrant", () => httpCheck("http://localhost:6333"), 30000),
      waitForService("minio", () => httpCheck("http://localhost:9000/minio/health/live"), 15000),
    ]);

    // Initialize
    log("startup", "Inicializando serviços...", c.cyan);
    await initElasticsearch();
    await initMinio();

    // Run Prisma migrations
    log("startup", "Aplicando migrações do banco...", c.cyan);
    try {
      execSync("npm run db:push", { cwd: ROOT, stdio: "inherit" });
      log("prisma", "Schema sincronizado", c.green);
    } catch (e) {
      log("prisma", "Erro ao sincronizar schema - verifique a conexão com o banco", c.red);
    }
  }

  if (mode === "app" || mode === "all") {
    startApp();
  }

  console.log(`
${c.green}═══════════════════════════════════════════
  Serviços rodando! Acesse:

  Frontend:        http://localhost:3000
  API:             http://localhost:3001
  API Docs:        http://localhost:3001/docs
  MinIO Console:   http://localhost:9001
  Qdrant:          http://localhost:6333/dashboard
═══════════════════════════════════════════${c.reset}

  Pressione Ctrl+C para encerrar tudo.
`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  shutdown();
});
