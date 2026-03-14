<p align="center">
  <img src="./doc/FOCA_White.jpg" alt="FOCA Logo" width="300"/>
</p>

<h1 align="center">FOCA — Fingerprinting Organizations with Collected Archives</h1>

<p align="center">
  <strong>Herramienta de extracción de metadatos e información oculta en documentos</strong><br/>
  <em>Metadata extraction and hidden information fingerprinting tool</em>
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
</p>

---

## Basado en / Based On

Este proyecto es un fork actualizado y migrado de la herramienta original **FOCA (Open Source)** desarrollada por **ElevenPaths** (Telefónica Tech).

> This project is an updated and migrated fork of the original **FOCA (Open Source)** tool developed by **ElevenPaths** (Telefónica Tech).

**Proyecto original / Original project:** [https://github.com/ElevenPaths/FOCA](https://github.com/ElevenPaths/FOCA)

---

## ¿Qué es FOCA? / What is FOCA?

**FOCA** es una herramienta utilizada principalmente para encontrar **metadatos e información oculta** en los documentos que analiza. Estos documentos pueden encontrarse en páginas web y ser descargados y analizados con FOCA.

Es capaz de analizar una amplia variedad de documentos, siendo los más comunes los de **Microsoft Office**, **Open Office** o **PDF**, aunque también analiza archivos de Adobe InDesign o SVG, entre otros.

Los documentos se buscan utilizando tres motores de búsqueda posibles: **Google**, **Bing** y **DuckDuckGo**. La suma de los resultados de los tres motores proporciona una gran cantidad de documentos. También es posible añadir archivos locales para extraer la información **EXIF** de archivos gráficos, y se realiza un análisis completo de la información descubierta a través de la URL incluso antes de descargar el archivo.

---

## ✨ Migración y actualización / Migration & Update

Todo el código ha sido **migrado y actualizado utilizando Vibe Coding** — un enfoque de desarrollo asistido por inteligencia artificial que combina la intuición humana con la capacidad de síntesis de modelos de lenguaje grandes (LLMs), en este caso **Claude (Anthropic)**.

> All code has been **migrated and updated using Vibe Coding** — an AI-assisted development approach combining human intuition with the synthesis capability of large language models (LLMs), in this case **Claude (Anthropic)**.

<p align="center">
  <img src="https://img.shields.io/badge/AI%20Assisted-Claude%20by%20Anthropic-blueviolet?logo=anthropic" alt="Claude by Anthropic"/>
</p>

---

## 🏭 Releases

Consulta la última versión / Check the latest releases:

➡️ [https://github.com/ElevenPaths/FOCA/releases](https://github.com/ElevenPaths/FOCA/releases)

---

## ✔️ Requisitos / Requirements

Para ejecutar la solución localmente el sistema necesitará:

| Requisito | Detalle |
|-----------|---------|
| **OS** | Microsoft Windows 64 bits (7, 8, 8.1, 10, 11) |
| **Runtime** | Microsoft .NET Framework 4.7.1 |
| **C++ Runtime** | Microsoft Visual C++ 2010 x64 o superior |
| **Base de datos** | SQL Server 2014 o superior |

> Al iniciar la aplicación, el sistema comprobará si hay una instancia de **SQL Server** disponible. Si no se encuentra ninguna, el sistema mostrará una ventana para introducir una cadena de conexión.

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
| **Francisco Oca González** | Desarrollo / Development *(el nombre FOCA es en su honor)* |
| **Enrique Rando González** | Investigación / Research |
| **Daniel Romero Pérez** | Investigación / Research |
| **Alejandro Nolla Blanco** | Colaborador / Collaborator |
| **John C. Matherly** | Integración Shodan / Shodan Integration |

### Contribuidores del Repositorio / Repository Contributors

| Nombre | Organización |
|--------|-------------|
| **Ioseba Palop** | ElevenPaths / 11paths |
| **Marina Bezares** | ElevenPaths / 11paths |
| **Cristóbal Bordiú** | ElevenPaths / 11paths |
| **Eduardo Cáceres** | Colaborador / Contributor |

### Fork y Migración / Fork & Migration

| Nombre | Rol |
|--------|-----|
| **Carluve** | Mantenedor del fork / Fork maintainer |
| **Claude (Anthropic)** | Asistencia de Vibe Coding / Vibe Coding assistance |

---

## 🔗 Herramientas y Dependencias / Tools & Dependencies

| Herramienta | Uso |
|-------------|-----|
| [Shodan](https://www.shodan.io/) | Búsqueda de dispositivos en red / Network device search |
| [MetadataExtractor](https://github.com/drewnoakes/metadata-extractor-dotnet) | Extracción de metadatos EXIF / EXIF metadata extraction |
| [NLog](https://nlog-project.org/) | Sistema de logging / Logging framework |
| [Entity Framework](https://docs.microsoft.com/ef/) | ORM para base de datos / Database ORM |

---

## 📜 Licencia / License

Este proyecto se distribuye bajo la licencia **GNU General Public License v3.0 (GPL-3.0)**.

> This project is distributed under the **GNU General Public License v3.0 (GPL-3.0)**.

De acuerdo con los términos de la licencia GPL-3.0, cualquier distribución o modificación de este software debe:

- Incluir el código fuente completo o una oferta para proporcionarlo.
- Mantener los avisos de copyright y licencia originales.
- Distribuirse bajo la misma licencia GPL-3.0.
- Dar crédito a los autores originales (**ElevenPaths / Telefónica Tech**).

> According to the GPL-3.0 license terms, any distribution or modification of this software must:
>
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
    Fork por <strong>Carluve</strong> •
    Migrado con <strong>Vibe Coding ✨</strong> •
    <a href="https://www.gnu.org/licenses/gpl-3.0.en.html">GPL-3.0</a>
  </sub>
</p>
