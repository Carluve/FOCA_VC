# FOCA Web

**FOCA Web** es la versión cloud-native de [FOCA](https://github.com/ElevenPaths/FOCA), la herramienta de análisis de metadatos de documentos. Reescrita en TypeScript y desplegada 100% sobre Cloudflare Workers, sin servidores.

```
██████╗  ██████╗  ██████╗ █████╗
██╔══██╗██╔═══██╗██╔════╝██╔══██╗
██████╔╝██║   ██║██║     ███████║
██╔══██╗██║   ██║██║     ██╔══██║
██║  ██║╚██████╔╝╚██████╗██║  ██║
╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
Metadata Analysis · Cloud Native
```

**Live:** https://foca-web.carluve.workers.dev

---

## Qué hace

Sube un documento (PDF, DOCX, XLSX, PPTX) y FOCA Web extrae toda la metadata incrustada que puede revelar información sensible:

| Dato extraído | Ejemplos |
|---------------|---------|
| Usuarios | Autor del documento, rutas `C:\Users\juan` |
| Emails | Direcciones encontradas en el cuerpo o metadatos |
| Rutas internas | `\\servidor\compartido\proyecto`, `/home/carlos/docs` |
| Servidores | Nombres de host de rutas UNC |
| Software | Microsoft Word 16.0, LibreOffice, Adobe Acrobat |
| SO | Windows, macOS, Linux (inferido del software) |
| Fechas | Creación y modificación del documento |

Además genera un **resumen de seguridad con IA** (Llama 3.3 70B via Workers AI) que analiza los hallazgos y da recomendaciones, y descarga el fichero **limpio de metadatos**.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Cloudflare Workers (Wrangler v4) |
| Frontend | React 18 + Vite + TypeScript |
| Backend | Hono (API framework para Workers) |
| Base de datos | Cloudflare D1 (SQLite) |
| Almacenamiento | Cloudflare R2 (ficheros originales) |
| IA | Workers AI — `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| AI Gateway | Cloudflare AI Gateway `foca-v1` |
| Bot protection | Cloudflare Turnstile |
| Estilos | Tailwind CSS + JetBrains Mono (tema hacker terminal) |
| Observabilidad | Workers Logs (`[observability] enabled = true`) |

---

## Arquitectura

```
Browser
  │
  ├── /* (assets)   ──▶  Cloudflare CDN (dist/ estático)
  │                       index.html, JS bundle, logos
  │
  └── /api/*        ──▶  Cloudflare Worker (Hono)
                          │
                          ├── POST /api/analyze          # Sube y extrae metadatos
                          ├── GET  /api/history          # Lista análisis
                          ├── GET  /api/result/:id       # Resultado + summary IA
                          ├── GET  /api/download-clean/:id  # Fichero limpio
                          ├── POST /api/summarize/:id    # Genera/devuelve summary IA
                          ├── POST /api/turnstile/verify # Verifica token Turnstile
                          └── GET  /api/health           # Health check

Bindings del Worker:
  env.DB      → D1 (analyses, processing_logs)
  env.R2      → R2 bucket (originals/{id}/{filename})
  env.AI      → Workers AI (via AI Gateway foca-v1)
  env.ASSETS  → Static assets (SPA routing)
  env.CACHE   → KV (reservado para cache futura)
  TURNSTILE_SECRET_KEY → Worker Secret (no en código)
```

### Flujo de análisis

```
1. Usuario sube fichero  (POST /api/analyze)
   │
   ├── Guarda registro en D1  (status: uploaded)
   ├── Sube original a R2     (originals/{id}/{filename})
   ├── Extrae metadatos       (PDF extractor / Office extractor)
   └── Guarda resultado en D1 (status: completed, metadata JSON)

2. Usuario ve resultados  (GET /api/result/:id)
   │
   └── Devuelve metadata + logs + ai_summary (si existe)

3. Usuario pide resumen IA  (POST /api/summarize/:id)
   │
   ├── Si ai_summary ya existe → devuelve cacheado (sin coste IA)
   ├── Si no → llama a Workers AI via AI Gateway foca-v1
   ├── Guarda el resumen en D1 (columna ai_summary)
   └── El resumen persiste: se muestra automáticamente en visitas futuras

4. Usuario descarga fichero limpio  (GET /api/download-clean/:id)
   │
   ├── PDF  → Limpia /Info dictionary (Title, Author, Creator, Producer,
   │          CreationDate, ModDate, Keywords…) + bloque XMP
   └── DOCX/XLSX/PPTX → Elimina docProps/core.xml, docProps/app.xml,
                         docProps/custom.xml del ZIP
```

---

## Estructura del proyecto

```
foca-web/
├── index.html                    # Entry HTML (favicon, body bg)
├── wrangler.toml                 # Config Workers (bindings, assets, AI)
├── package.json
├── tailwind.config.js            # Tema verde hacker
├── tsconfig.json
├── vite.config.ts                # Build frontend + hash contraseña
├── env.d.ts                      # Tipos de bindings Cloudflare
│
├── migrations/
│   ├── 0001_initial.sql          # Tablas analyses + processing_logs
│   └── 0002_ai_summary.sql       # Columna ai_summary
│
├── public/
│   ├── logo_foca.png             # Logo banner (login)
│   ├── logo_square.png           # Logo icono (header + favicon)
│   └── foca-icon.svg             # SVG legacy
│
├── src/
│   ├── worker/                   # Backend (Cloudflare Worker)
│   │   ├── index.ts              # Entry point del Worker
│   │   ├── app.ts                # Hono app + rutas
│   │   ├── routes/
│   │   │   ├── analyze.ts        # POST /api/analyze
│   │   │   ├── result.ts         # GET  /api/result/:id
│   │   │   ├── history.ts        # GET  /api/history
│   │   │   ├── download-clean.ts # GET  /api/download-clean/:id
│   │   │   ├── summarize.ts      # POST /api/summarize/:id (Workers AI)
│   │   │   ├── turnstile.ts      # POST /api/turnstile/verify
│   │   │   └── health.ts         # GET  /api/health
│   │   ├── extractors/
│   │   │   ├── index.ts          # Dispatcher por tipo
│   │   │   ├── pdf.ts            # Extractor PDF (sin Node fs)
│   │   │   ├── office.ts         # Extractor DOCX/XLSX/PPTX (JSZip)
│   │   │   └── types.ts          # Interface ExtractedMetadata
│   │   └── lib/
│   │       ├── db.ts             # Helpers D1 (CRUD analyses + logs)
│   │       └── uuid.ts           # Generador de IDs
│   │
│   └── frontend/                 # React SPA
│       ├── main.tsx
│       ├── App.tsx               # Auth gate + rutas
│       ├── index.css             # Tailwind + efectos CRT/scanlines
│       ├── pages/
│       │   ├── LoginPage.tsx     # Login con Turnstile
│       │   ├── DashboardPage.tsx # Subida + historial
│       │   └── ResultPage.tsx    # Metadatos + resumen IA + descarga
│       ├── components/
│       │   ├── Header.tsx        # Cabecera sticky
│       │   ├── Footer.tsx        # "Powered by Cloudflare Workers"
│       │   ├── Turnstile.tsx     # Widget Cloudflare Turnstile
│       │   ├── FileDropZone.tsx  # Drag & drop
│       │   ├── HistoryTable.tsx  # Tabla de análisis
│       │   ├── MetadataView.tsx  # Visualización de metadatos
│       │   └── ProcessingLog.tsx # Timeline de logs
│       └── lib/
│           ├── api.ts            # Cliente HTTP del backend
│           └── hash.ts           # SHA-256 (Web Crypto API)
```

---

## Desarrollo local

### Requisitos

- Node.js 20+
- Wrangler CLI v4: `npm install -g wrangler`
- Cuenta Cloudflare con acceso a D1, R2, Workers AI

### Setup inicial

```bash
# 1. Instalar dependencias
cd foca-web
npm install

# 2. Crear recursos en Cloudflare (solo primera vez)
wrangler d1 create foca-db
wrangler r2 bucket create foca-files
wrangler kv namespace create CACHE

# 3. Actualizar wrangler.toml con los IDs reales obtenidos
# (database_id y kv id)

# 4. Aplicar migraciones
wrangler d1 migrations apply foca-db --local
wrangler d1 migrations apply foca-db --remote

# 5. Crear .dev.vars para desarrollo local
cat > .dev.vars << EOF
BUILD_TIME_PASSWORD=chema
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
EOF

# 6. Arrancar frontend (puerto 5173)
npm run dev

# 7. En otra terminal, arrancar el Worker local (puerto 8788)
npm run dev:worker
```

El proxy de Vite redirige `/api/*` al Worker en `localhost:8788`.

### Variables de entorno

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `BUILD_TIME_PASSWORD` | Build time / `.dev.vars` | Contraseña de acceso (se hashea en build, nunca en bundle) |
| `TURNSTILE_SECRET_KEY` | Worker Secret | Secret key de Cloudflare Turnstile para verificación server-side |
| `VITE_TURNSTILE_SITE_KEY` | Build time (opcional) | Site key de Turnstile (ya hardcodeada en `Turnstile.tsx`) |

---

## Despliegue

```bash
# Build frontend + deploy Worker en un paso
npm run deploy

# O por separado:
npm run build
wrangler deploy
```

### Setup de Cloudflare AI Gateway

1. Dashboard → **AI** → **AI Gateway** → **Create Gateway**
2. Nombre: `foca-v1`
3. El binding `[ai]` del Worker ya lo usa automáticamente

### Setup de Turnstile

1. Dashboard → **Turnstile** → **Add Site**
2. Dominios: `foca-web.carluve.workers.dev` (y los que necesites)
3. Copiar **Site Key** → va en `Turnstile.tsx` (o `VITE_TURNSTILE_SITE_KEY`)
4. Copiar **Secret Key** → `wrangler secret put TURNSTILE_SECRET_KEY`

---

## Base de datos (D1 Schema)

```sql
-- Análisis de documentos
CREATE TABLE analyses (
  id          TEXT PRIMARY KEY,       -- UUID
  filename    TEXT NOT NULL,
  filetype    TEXT NOT NULL,          -- MIME type
  filesize    INTEGER NOT NULL,       -- bytes
  status      TEXT NOT NULL DEFAULT 'uploaded',
                                      -- uploaded | analyzing | completed | error
  metadata    TEXT,                   -- JSON de metadatos extraídos
  ai_summary  TEXT,                   -- Resumen IA persistido (null hasta generarlo)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Logs de procesamiento por análisis
CREATE TABLE processing_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info',  -- info | warn | error
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Migraciones

```bash
# Aplicar todas las pendientes (remoto)
wrangler d1 migrations apply foca-db --remote

# Ver estado
wrangler d1 migrations list foca-db --remote
```

---

## API Reference

### `POST /api/analyze`

Sube un fichero para análisis.

**Request:** `multipart/form-data` con campo `file`.

**Response:**
```json
{
  "id": "uuid",
  "filename": "documento.pdf",
  "status": "completed",
  "metadata": { "author": "...", "users": [...], ... }
}
```

---

### `GET /api/result/:id`

Devuelve el análisis completo.

**Response:**
```json
{
  "id": "uuid",
  "filename": "documento.pdf",
  "filetype": "application/pdf",
  "filesize": 102400,
  "status": "completed",
  "metadata": { ... },
  "ai_summary": "## Resumen de seguridad...",
  "logs": [
    { "message": "File uploaded", "level": "info", "timestamp": "..." }
  ]
}
```

---

### `POST /api/summarize/:id`

Genera (o devuelve cacheado) el resumen IA del análisis.

- Si `ai_summary` ya existe en D1 → devuelve `{ summary, cached: true }` sin llamar a IA.
- Si no → llama a Workers AI, guarda en D1, devuelve `{ summary, cached: false }`.

**Modelo:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
**Gateway:** AI Gateway `foca-v1`

---

### `GET /api/download-clean/:id`

Descarga el fichero con metadatos eliminados.

| Formato | Limpieza |
|---------|---------|
| PDF | Vacía campos del `/Info` dictionary + bloque XMP |
| DOCX/XLSX/PPTX | Elimina `docProps/core.xml`, `docProps/app.xml`, `docProps/custom.xml` del ZIP |

---

### `POST /api/turnstile/verify`

Verifica un token de Cloudflare Turnstile server-side.

**Request:** `{ "token": "..." }`
**Response:** `{ "success": true }` o `{ "success": false, "error": "..." }`

---

### `GET /api/health`

```json
{ "status": "ok", "timestamp": "..." }
```

---

## Diseño (tema hacker terminal)

La interfaz usa una estética de terminal retro moderna:

- **Fondo:** `#0a0a0a` (negro profundo)
- **Color primario:** Emerald green (`#10b981` = `foca-500`)
- **Fuente:** JetBrains Mono (monospace)
- **Efecto CRT:** Scanlines CSS via pseudoelemento `::after`
- **Text glow:** `text-shadow` verde suave
- **Animaciones:** `blink` (cursor), `pulse-glow`, `scan`

---

## Licencia

MIT — ver [LICENSE](../LICENSE) en la raíz del repositorio.

---

*Powered by Cloudflare Workers*
