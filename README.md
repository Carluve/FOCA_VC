<p align="center">
  <img src="./doc/FOCA_White.jpg" alt="FOCA Logo" width="300"/>
</p>

<h1 align="center">FOCA — Fingerprinting Organizations with Collected Archives</h1>

<p align="center">
  <strong>Herramienta de extracción de metadatos e información oculta en documentos</strong><br/>
  <em>Metadata extraction and hidden information fingerprinting tool for OSINT</em>
</p>

<p align="center">
  <a href="https://www.gnu.org/licenses/gpl-3.0.en.html">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="License: GPL v3"/>
  </a>
  <a href="https://github.com/ElevenPaths/FOCA/releases">
    <img src="https://img.shields.io/badge/version-3.4.7.1-green.svg" alt="Version"/>
  </a>
  <img src="https://img.shields.io/badge/.NET-4.7.1-purple.svg" alt=".NET Framework"/>
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey.svg" alt="Platform"/>
  <img src="https://img.shields.io/badge/built%20with-Vibe%20Coding%20%E2%9C%A8-ff69b4.svg" alt="Built with Vibe Coding"/>
  <img src="https://img.shields.io/badge/AI%20Assisted-Claude%20by%20Anthropic-blueviolet?logo=anthropic" alt="Claude by Anthropic"/>
</p>

---

## El reto: modernizar una herramienta clásica de OSINT

**FOCA** es una de esas herramientas que cualquier profesional de ciberseguridad en el ámbito hispanohablante conoce. Creada por el equipo de **ElevenPaths (Telefónica Tech)** y bautizada en honor a **Francisco Oca González**, lleva más de una década siendo una referencia para el análisis de metadatos y la recopilación de información pasiva (*OSINT*).

El problema: el repositorio original lleva tiempo sin mantenimiento activo. Dependencias desactualizadas, bugs conocidos en la extracción de EXIF, consultas rotas a Bing y DuckDuckGo, código con variables sin usar... Una herramienta históricamente valiosa que necesitaba una puesta a punto.

El reto que me propuse: **migrar, modernizar y corregir FOCA** usando **Vibe Coding** asistido por **Claude (Anthropic)**. Sin tocar lo que funciona, arreglando lo que está roto, actualizando lo que quedó obsoleto.

> **The challenge**: FOCA is a classic OSINT tool by ElevenPaths that needed modernization. The goal was to update dependencies, fix known bugs, and clean up the codebase using AI-assisted Vibe Coding with Claude (Anthropic).

---

## ¿Qué es FOCA? / What is FOCA?

**FOCA** (*Fingerprinting Organizations with Collected Archives*) es una herramienta utilizada principalmente para encontrar **metadatos e información oculta** en documentos públicos. Esa información puede revelar datos sensibles de una organización: nombres de usuarios, rutas de red internas, versiones de software, servidores, impresoras...

Los documentos se obtienen directamente de la web usando tres motores de búsqueda: **Google**, **Bing** y **DuckDuckGo**. También admite la carga de archivos locales para extraer información **EXIF** de imágenes y documentos gráficos.

Tipos de documentos analizados:
- Microsoft Office (`.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`)
- PDF (incluyendo imágenes embebidas)
- Open Office (`.odt`, `.ods`, `.odp`)
- Adobe InDesign, SVG, y otros

Además de los metadatos, FOCA realiza análisis de red: **DNS**, **WHOIS**, **enumeración de subdominios**, **DNS Cache Snooping**, **DNS Transfer Zone**, y búsqueda de metadatos en la URL antes incluso de descargar los archivos.

---

## El proceso de migración con Vibe Coding

Todo el trabajo de actualización se realizó siguiendo la metodología **Vibe Coding**: el desarrollador humano define el objetivo, identifica los problemas y valida los resultados; el modelo de lenguaje (**Claude de Anthropic**) analiza el código, propone las soluciones y genera los cambios. Una colaboración donde la intuición humana y la capacidad de síntesis de la IA se complementan.

> All update work was done following the **Vibe Coding** methodology: the human developer defines objectives and validates results; the language model (**Claude by Anthropic**) analyzes code, proposes solutions, and generates changes.

### Fase 1 — Análisis del código legacy

Lo primero fue entender el estado real del proyecto. El repositorio original de ElevenPaths había acumulado varios años de deuda técnica:

- Referencias a paquetes NuGet en el formato antiguo (`packages.config`)
- Dependencias desactualizadas con vulnerabilidades conocidas
- Variables y funciones sin usar dispersas por el código
- Búsquedas web (Bing, Google) con URLs desactualizadas o rotas
- Extracción EXIF fallando con determinados tipos de PDF

Claude analizó el árbol de dependencias, los `.csproj` y los archivos de configuración para trazar un mapa completo de lo que había que actualizar.

### Fase 2 — Migración de paquetes

Se migró el formato de referencias de NuGet de `packages.config` al formato moderno **PackageReference** en todos los proyectos de la solución:

- `FOCA/FOCA.csproj`
- `MetadataExtractCore/MetadataExtractCore.csproj`
- `SearcherCore/SearcherCore/SearcherCore.csproj`

Esta migración simplificó enormemente la gestión de dependencias y preparó el proyecto para actualizaciones futuras más sencillas.

### Fase 3 — Actualización de dependencias

Con el nuevo formato en su lugar, se actualizaron las dependencias críticas:

| Paquete | Versión anterior | Versión nueva |
|---------|-----------------|---------------|
| **MetadataExtractor** | 2.1.0 | 2.2.0 |
| Resto de referencias NuGet | Múltiples versiones antiguas | Últimas versiones estables |

La actualización de **MetadataExtractor** fue especialmente relevante: corrigió problemas de extracción EXIF que afectaban tanto a imágenes como a PDFs con imágenes embebidas.

### Fase 4 — Corrección de bugs

Esta fue la fase más extensa. Se identificaron y corrigieron los fallos más reportados por la comunidad:

**Extracción de metadatos:**
- Mejoras generales en la extracción EXIF (`#84`)
- Correcciones en la extracción de PDFs (`#85`)
- Análisis de metadatos EXIF en imágenes embebidas dentro de PDFs (`#89`)
- Fix en el análisis EXIF de imágenes embebidas en PDF (`#92`)

**Búsquedas web:**
- Actualización de la URL de la API de Bing (`#113`)
- Corrección de la query en BingWeb (`#116`)
- Fix en la paginación de Google con `MaxPages` (`#88`)

**DNS y red:**
- Corrección en `SearchCommonNames` del módulo DNS (`#112`)
- Eliminación de peticiones innecesarias en DNS Cache Snooping (`#94`)
- Refactorización del módulo DNSDumpster (`#114`)

**Interfaz y navegación:**
- Mejoras en el árbol de navegación (`#91`)
- Corrección del bug al eliminar archivos (`#100`)

**Plugins:**
- Refactorización del plugin SQLi (`#115`)

### Fase 5 — Limpieza y refactoring

Para cerrar el ciclo, se hizo una pasada de limpieza general del código:

- Eliminación de variables no utilizadas
- Eliminación de funciones sin uso real
- Limpieza de referencias obsoletas
- Actualización final de paquetes NuGet

---

## ✔️ Requisitos / Requirements

Para ejecutar la solución localmente:

| Requisito | Detalle |
|-----------|---------|
| **OS** | Microsoft Windows 64 bits (7, 8, 8.1, 10, 11) |
| **Runtime** | Microsoft .NET Framework 4.7.1 |
| **C++ Runtime** | Microsoft Visual C++ 2010 x64 o superior |
| **Base de datos** | SQL Server 2014 o superior |

> Al iniciar la aplicación, el sistema comprobará si hay una instancia de **SQL Server** disponible. Si no se encuentra ninguna, se mostrará una ventana para introducir la cadena de conexión manualmente.

> On startup, the app checks for an available **SQL Server** instance. If none is found, a dialog prompts for a connection string.

---

## 🏭 Releases

Consulta la última versión disponible:

➡️ [https://github.com/ElevenPaths/FOCA/releases](https://github.com/ElevenPaths/FOCA/releases)

---

## 🔗 Herramientas y Dependencias / Tools & Dependencies

| Herramienta | Uso |
|-------------|-----|
| [Shodan](https://www.shodan.io/) | Búsqueda de dispositivos en red / Network device search |
| [MetadataExtractor](https://github.com/drewnoakes/metadata-extractor-dotnet) | Extracción de metadatos EXIF / EXIF metadata extraction |
| [NLog](https://nlog-project.org/) | Sistema de logging / Logging framework |
| [Entity Framework](https://docs.microsoft.com/ef/) | ORM para base de datos / Database ORM |
| [Claude (Anthropic)](https://www.anthropic.com) | Asistencia Vibe Coding / Vibe Coding assistance |

---

## 👥 Créditos y Autoría / Credits & Authorship

### Creadores Originales / Original Creators

**ElevenPaths** (Telefónica Tech) — empresa creadora de FOCA.

| Nombre | Rol |
|--------|-----|
| **Chema Alonso Cebrián** | Arquitecto / Chief Digital Officer |
| **Manuel Fernández Fernández** | Desarrollo principal / Lead Developer |
| **Antonio Guzmán Sacristán** | Investigación y desarrollo / R&D |
| **Pedro Laguna Durán** | Investigación / Research |
| **Alejandro Martín Bailón** | Desarrollo / Development |
| **Francisco Oca González** | Desarrollo / Development *(el nombre FOCA es en su honor / the name FOCA honors him)* |
| **Enrique Rando González** | Investigación / Research |
| **Daniel Romero Pérez** | Investigación / Research |
| **Alejandro Nolla Blanco** | Colaborador / Collaborator |
| **John C. Matherly** | Integración Shodan / Shodan Integration |

### Contribuidores del Repositorio Original / Original Repository Contributors

| Nombre | Organización |
|--------|-------------|
| **Ioseba Palop** | ElevenPaths / 11paths |
| **Marina Bezares** | ElevenPaths / 11paths |
| **Cristóbal Bordiú** | ElevenPaths / 11paths |
| **Eduardo Cáceres** | Colaborador / Contributor |

### Fork, Migración y Mantenimiento / Fork, Migration & Maintenance

| Nombre | Rol |
|--------|-----|
| **Carluve** | Mantenedor del fork, migración y actualización / Fork maintainer, migration & update |
| **Claude (Anthropic)** | Asistencia de Vibe Coding / Vibe Coding assistance |

---

## Basado en / Based On

Este proyecto es un fork actualizado y mantenido de la herramienta original **FOCA (Open Source)** desarrollada por **ElevenPaths** (Telefónica Tech).

> This project is an updated and maintained fork of the original **FOCA (Open Source)** tool developed by **ElevenPaths** (Telefónica Tech).

**Proyecto original / Original project:** [https://github.com/ElevenPaths/FOCA](https://github.com/ElevenPaths/FOCA)

---

## 📜 Licencia / License

Este proyecto se distribuye bajo la licencia **GNU General Public License v3.0 (GPL-3.0)**.

> This project is distributed under the **GNU General Public License v3.0 (GPL-3.0)**.

De acuerdo con los términos de la licencia GPL-3.0, cualquier distribución o modificación de este software debe:

- Incluir el código fuente completo o una oferta para proporcionarlo.
- Mantener los avisos de copyright y licencia originales.
- Distribuirse bajo la misma licencia GPL-3.0.
- Dar crédito a los autores originales (**ElevenPaths / Telefónica Tech**).

> According to the GPL-3.0 license terms, any distribution or modification must:
> - Include the complete source code or an offer to provide it.
> - Retain the original copyright and license notices.
> - Be distributed under the same GPL-3.0 license.
> - Give credit to the original authors (**ElevenPaths / Telefónica Tech**).

**Copyright (C) ElevenPaths — Telefónica Tech. All rights reserved.**

[![GNU GPL v3](https://www.gnu.org/graphics/gplv3-127x51.png)](https://www.gnu.org/licenses/gpl-3.0.en.html)

---

## 🔊 Mantente al día / Stay Tuned

- [<img src="./doc/Twitter_Social_Icon_Circle_Color.svg" width="20" height="20"/> @Fear_the_Foca](https://twitter.com/Fear_the_Foca)
- [ElevenPaths](https://www.elevenpaths.com/labstools/foca/index.html)
- [El lado del Mal — Blog de Chema Alonso](https://www.elladodelmal.com)

---

## 📰 Posts de referencia / Reference Blog Posts

### Sobre FOCA / About FOCA

- [ES] [FOCA Open Source](https://www.elladodelmal.com/2017/10/foca-open-source.html) — Chema Alonso, *El lado del Mal* (2017) — Lanzamiento de FOCA como Open Source en GitHub
- [ES] [Fear the FOCA around the world](https://www.elladodelmal.com/2020/01/fear-foca-around-world-fearthefoca.html) — Chema Alonso, *El lado del Mal* (2020) — Impacto global de FOCA en la comunidad de seguridad

### Sobre Vibe Coding / About Vibe Coding

- [ES] [¿Qué es el "Vibe Coding"?](https://www.elladodelmal.com/2025/03/que-es-el-vibe-coding.html) — Chema Alonso, *El lado del Mal* (2025) — Introducción a la metodología Vibe Coding
- [EN] [Insane Vibe Coding with Harsh Prompting](https://www.elladodelmal.com/2025/07/insane-vibe-coding-with-harsh-prompting.html) — Chema Alonso, *El lado del Mal* (2025) — Técnicas avanzadas de Vibe Coding con prompting agresivo
- [EN] [Cómo migrar Arkanoid de C++ a TypeScript con Vibe Coding](https://www.elladodelmal.com/2026/03/como-migrar-arkanoid-de-c-typescript.html) — Carlos Luengo & Chema Alonso, *El lado del Mal* (2026) — Caso de uso de migración de código legacy con IA

---

## ☕ Lectura adicional / Further Reading

- [ElevenPaths — FOCA](https://www.elevenpaths.com/labstools/foca/index.html)
- [ES] [Pentesting con FOCA — 0xWord](https://0xword.com/es/libros/59-pentesting-con-foca.html)
- [ES] [Wikipedia — FOCA Tool](https://es.wikipedia.org/wiki/FOCA_Tool)
- [ES] [Cómo analizar documentos con FOCA](https://empresas.blogthinkbig.com/como-analizar-documentos-con-foca/)

---

## 📄 Pie de créditos / Credits Footer

```
FOCA (Fingerprinting Organizations with Collected Archives)
Copyright (C) ElevenPaths — Telefónica Tech

Fork mantenido por Carluve.
Migrado y actualizado con Vibe Coding asistido por Claude (Anthropic).

Basado en el proyecto original: https://github.com/ElevenPaths/FOCA
Licencia: GNU General Public License v3.0
```

---

<p align="center">
  <img src="./doc/FOCA_White.jpg" alt="FOCA" width="120"/>
  <br/>
  <sub>
    Basado en FOCA de <strong>ElevenPaths (Telefónica Tech)</strong> •
    Fork y mantenimiento por <strong>Carluve</strong> •
    Migrado con <strong>Vibe Coding ✨</strong> asistido por <strong>Claude (Anthropic)</strong> •
    <a href="https://www.gnu.org/licenses/gpl-3.0.en.html">GPL-3.0</a>
  </sub>
</p>
