# De C# y Windows a TypeScript y Cloudflare Workers: Resucitando FOCA con OpenCode

Si la semana pasada [migramos el Arkanoid de C++ a TypeScript](https://www.elladodelmal.com/2026/03/como-migrar-arkanoid-de-c-typescript.html) con **OpenCode** y lo desplegamos en Cloudflare Workers en una tarde, esta semana teníamos que subir el listón. Y nada mejor para hacerlo que coger una herramienta que muchos de vosotros conocéis de sobra: **FOCA**.

Sí, **FOCA (Fingerprinting Organizations with Collected Archives)**, la herramienta de análisis de metadatos que creó el equipo de ElevenPaths y que lleva años siendo referencia en el mundo del OSINT y el pentesting. La aplicación de escritorio para Windows escrita en C# que muchos habéis usado para encontrar usuarios, rutas internas, servidores e información sensible escondida en los metadatos de los documentos corporativos.

El reto esta vez era más ambicioso que el Arkanoid: no solo migrar el código, sino **modernizar la solución completa**: interfaz web, backend serverless, base de datos en la nube, almacenamiento de ficheros, protección anti-bots, análisis con IA y despliegue continuo. Todo en Cloudflare. Todo sin servidores. Y con **OpenCode** llevando el peso técnico.

---

## El origen: FOCA en GitHub, 3.400 estrellas y 100% C#

Empecemos por el principio. El repositorio original de FOCA en GitHub tiene 3.400 estrellas, 611 forks y está escrito en **C# al 100%**. Es una aplicación de escritorio con Windows Forms, dependencias de .NET y una arquitectura que en su momento fue muy sólida, pero que hoy exige que el usuario tenga una máquina Windows con el entorno instalado para poder ejecutarla.

![FOCA original en GitHub](03-foca-original-github.png)

El repositorio tiene el código organizado en varios proyectos: el motor de extracción de metadatos (*MetadataExtractCore*), los buscadores y crawlers, los plugins y la interfaz de usuario. Una arquitectura de hace diez años, con todas las dependencias que eso implica.

La pregunta era: ¿se puede recrear la funcionalidad principal de FOCA —extracción de metadatos de documentos— en una aplicación web moderna, serverless, accesible desde cualquier dispositivo y desplegada en la red de Cloudflare? La respuesta, spoiler, es que sí. Y además con cosas que la FOCA original no tenía, como **análisis de seguridad generado por IA**.

---

## La sesión de OpenCode: 115 mensajes, $4,96 y un proyecto completo

Antes de ver el resultado, hay que hablar del proceso. Porque esta vez no fue una sesión de una hora. Fue una sesión de trabajo real, con OpenCode como copiloto técnico, gestionando decisiones de arquitectura, escribiendo código, detectando errores de tipos en TypeScript y desplegando en Cloudflare.

![Sesión de OpenCode — estadísticas de la sesión](04-opencode-session.png)

Si os fijáis en los números de la sesión: **115 mensajes**, proveedor **Anthropic vía Cloudflare AI Gateway**, modelo **Claude Opus 4.6**, 93.677 tokens totales, coste total **$4,96**. Por menos de cinco dólares, OpenCode escribió toda la arquitectura del proyecto, todos los componentes frontend, todas las rutas del backend, las migraciones de base de datos, los extractores de metadatos para PDF y Office, la integración con Workers AI, el widget de Turnstile y el README completo.

Y lo más interesante del screenshot: fijaos en que el propio OpenCode está usando **Cloudflare AI Gateway** para enrutar sus llamadas a Claude. Es decir, la herramienta que estamos usando para construir sobre Cloudflare está ella misma corriendo sobre Cloudflare. Inception nivel empresarial.

---

## La arquitectura: todo Cloudflare, cero servidores

La FOCA Web que hemos construido usa el stack completo de Cloudflare:

- **Cloudflare Workers** — El backend completo corre como un Worker. Un único binario TypeScript que maneja todas las rutas de la API (`/api/analyze`, `/api/result/:id`, `/api/summarize/:id`…) usando **Hono** como framework HTTP.
- **Static Assets en Workers** — El frontend React/Vite se sirve directamente desde el Worker con el nuevo sistema de `[assets]` de Wrangler v4. Nada de Pages, nada de CDN separado. Un solo despliegue: `wrangler deploy`.
- **D1** — Base de datos SQLite gestionada por Cloudflare. Guarda cada análisis con su estado, los metadatos extraídos en JSON, el resumen de IA y los logs de procesamiento.
- **R2** — Almacenamiento de objetos compatible con S3. Cada fichero subido se guarda en R2 para poder descargarlo limpio después.
- **Workers AI** — Inferencia de IA en el edge. El modelo `@cf/meta/llama-3.3-70b-instruct-fp8-fast` genera el análisis de seguridad de los metadatos directamente desde el Worker, sin llamadas externas.
- **AI Gateway** — Todas las llamadas a Workers AI pasan por el gateway *foca-v1*, que proporciona observabilidad, caché, logs y control de rate limiting.
- **Turnstile** — Protección anti-bots en el login. El widget se integra en el frontend, la verificación se hace server-side en el Worker.

---

## Lo que no fue trivial: los extractores de metadatos sin Node.js

Aquí está el reto técnico real de la migración. El runtime de Cloudflare Workers **no es Node.js**. Es V8 puro, con las APIs de Web Platform pero sin acceso al sistema de ficheros, sin `fs`, sin la mayoría de los módulos de Node. Esto descarta de golpe herramientas como `exiftool`, `pdf-parse` en su versión completa o cualquier librería que dependa del sistema operativo.

La solución para los **documentos Office** (DOCX, XLSX, PPTX) fue elegante: estos formatos son ZIPs por dentro. Usando **JSZip**, que funciona perfectamente en Workers, se descomprime el fichero, se leen los XMLs de propiedades (`docProps/core.xml`, `docProps/app.xml`) y se extraen los campos: autor, empresa, último editor, fechas, rutas de template...

Para los **PDFs** el enfoque fue diferente. Los metadatos en un PDF están en el diccionario `/Info` del documento, embebidos como texto en el binario. OpenCode implementó un extractor que lee el fichero como `ArrayBuffer`, lo decodifica en `latin1` (para preservar los bytes binarios) y usa expresiones regulares para extraer los campos del diccionario: `/Author (valor)`, `/Creator (valor)`, `/Producer (valor)`, etc.

El mismo approach se usa para la limpieza: se reemplazan los valores por cadenas vacías en el binario, se parchea también el bloque XMP si existe, y se recodifica de vuelta a `Uint8Array`. Sin librerías externas, sin Node, puro JavaScript en el edge.

---

## El resumen de IA que se persiste solo

Una de las funciones más interesantes es el análisis de seguridad generado por IA. Cuando el usuario pulsa *"ai_summary"* en la pantalla de resultados, el Worker llama a Workers AI con el modelo Llama 3.3 70B y un prompt que describe los metadatos extraídos: usuarios encontrados, emails, rutas internas, software usado, sistema operativo...

El modelo responde en español con un análisis estructurado: qué información sensible se ha encontrado, qué riesgos implica y qué recomendaciones hay para limpiar el documento antes de compartirlo. Pero lo interesante es lo que pasa después: el resumen se **guarda en D1** en una columna `ai_summary`. La próxima vez que alguien abra ese análisis, el resumen aparece directamente, sin llamar a la IA de nuevo. Caché persistente con cero infraestructura adicional.

![Análisis de seguridad por IA en la interfaz de FOCA Web](02-foca-web-ai-summary.png)

En la imagen podéis ver un análisis real de un PDF. El modelo ha identificado que el documento fue creado con **LaTeX con hyperref** y producido con **pdfTeX-1.40.27**, ha analizado las fechas de creación y modificación, y ha concluido que aunque no hay información altamente sensible, el software usado podría ser relevante para un atacante que quisiera explotar vulnerabilidades conocidas de esa versión. Todo en español, bien estructurado, con recomendaciones concretas.

---

## La interfaz: terminal hacker verde porque sí

Y aquí viene la parte que más me gusta del proyecto. Cuando le dijimos a OpenCode que queríamos una interfaz "retro hacker verde pero que se vea moderna", el resultado fue exactamente lo que teníamos en mente: fondo negro `#0a0a0a`, texto en verde esmeralda, fuente **JetBrains Mono**, efecto CRT de scanlines con CSS puro, comandos de terminal como títulos de sección (`$ analyze --upload`, `$ history --list`), y la barra de título con los tres puntos rojo/amarillo/verde.

![Dashboard de FOCA Web con historial de análisis](01-foca-web-dashboard.png)

En el dashboard podéis ver el historial real de análisis. PDFs de todo tipo: un whitepaper de diseño de 3,9 MB, un perfil corporativo de 1,5 MB, DOCX de propuestas... y en la barra inferior el footer que no podía faltar: *"powered_by :: ☁ Cloudflare Workers"*.

El login tiene el widget de **Cloudflare Turnstile** integrado. La contraseña se hashea en el navegador con SHA-256 usando la Web Crypto API antes de compararse, así el hash va en el build pero la contraseña real nunca aparece en el bundle. Y la secret key de Turnstile vive como secreto del Worker, nunca en el código.

---

## Wrangler v4 y la migración de Pages a Workers

Un detalle importante del proceso: el proyecto empezó con Cloudflare Pages (el servicio tradicional para frontends estáticos con Functions). Durante el desarrollo, lo migramos completamente a **Workers con Static Assets**, que es el nuevo modelo unificado de Wrangler v4.

La diferencia es conceptual: en lugar de tener un proyecto Pages con Functions separadas, ahora tienes un único Worker que tiene acceso a los assets estáticos de tu frontend a través del binding `env.ASSETS`. El `wrangler.toml` queda así:

```toml
name = "foca-web"
main = "src/worker/index.ts"
compatibility_date = "2026-03-13"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]

[[d1_databases]]
binding = "DB"
database_name = "foca-db"
database_id = "..."

[[r2_buckets]]
binding = "R2"
bucket_name = "foca-files"

[ai]
binding = "AI"
```

Con `run_worker_first = ["/api/*"]` le decimos al runtime que las rutas de API pasen por el Worker antes de intentar servir un asset. Todo lo demás (el frontend React) se sirve directamente desde la CDN de Cloudflare sin tocar el Worker. Elegante y eficiente.

---

## El resultado: Fear the FOCA, ahora en el cloud

En resumen, lo que hemos construido en esta sesión:

- ✅ Extracción de metadatos de PDF, DOCX, XLSX y PPTX en el edge, sin Node.js
- ✅ Descarga del fichero limpio de metadatos (PDF rewriting + ZIP patching)
- ✅ Análisis de seguridad con IA (Llama 3.3 70B) persistido en D1
- ✅ Historial completo de análisis con logs de procesamiento
- ✅ Protección anti-bots con Cloudflare Turnstile
- ✅ Interfaz retro hacker verde con JetBrains Mono y efecto CRT
- ✅ Despliegue completo en Cloudflare Workers con un solo comando
- ✅ Coste de infraestructura: prácticamente cero (Workers Free tier)

El repo está en [github.com/Carluve/FOCA_VC](https://github.com/Carluve/FOCA_VC) y la aplicación live en [foca-web.carluve.workers.dev](https://foca-web.carluve.workers.dev).

La próxima vez que alguien os diga que las herramientas de ciberseguridad clásicas están muertas, mostrarles esto. FOCA sigue aquí, ahora corriendo en 330 ubicaciones alrededor del mundo, con IA integrada y sin necesidad de instalar nada. El lado del mal también se moderniza.

**Saludos,
Carlos Luengo**
*Sr. Account Executive en Cloudflare*
