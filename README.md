# XYZ Dashboard

<p align="center">
  <img src="./assets/banner-main.svg" alt="XYZ Dashboard banner principal" width="100%" />
</p>

<p align="center">
  <a href="https://tauri.app/">
    <img alt="Tauri" src="https://img.shields.io/badge/Tauri-Desktop-blue?logo=tauri&logoColor=white">
  </a>
  <a href="https://react.dev/">
    <img alt="React" src="https://img.shields.io/badge/React-UI-149eca?logo=react&logoColor=white">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript&logoColor=white">
  </a>
  <a href="https://pnpm.io/">
    <img alt="pnpm" src="https://img.shields.io/badge/pnpm-Package%20Manager-f69220?logo=pnpm&logoColor=white">
  </a>
</p>

Launcher tipo macro-pad flotante construido con **Tauri + React + TypeScript** para ejecutar comandos y abrir URLs rapidamente.

Floating macro-pad launcher built with **Tauri + React + TypeScript** to run commands and open URLs quickly.

<p align="center">
  <img src="./assets/banner-features.svg" alt="XYZ Dashboard banner de funciones" width="100%" />
</p>

## Table of Contents

- [Que es / What is](#que-es--what-is)
- [Funciones / Features](#funciones--features)
- [Seguridad / Security](#seguridad--security)
- [Stack](#stack)
- [Instalacion y desarrollo / Setup](#instalacion-y-desarrollo--setup)
- [Build y releases](#build-y-releases)
- [Assets de documentacion](#assets-de-documentacion)
- [Docs extra](#docs-extra)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

## Que es / What is

**ES:** XYZ Dashboard es un panel de accesos rapidos para centralizar tareas frecuentes (scripts, comandos, herramientas y enlaces) en una interfaz flotante.

**EN:** XYZ Dashboard is a quick-access panel that centralizes frequent tasks (scripts, commands, tools, and links) in a floating UI.

## Funciones / Features

**ES**

- Define botones con comando, URL e icono.
- Abre/cierra el panel con atajo global.
- Organiza accesos para tareas frecuentes (desarrollo, sistema, herramientas, scripts).
- Mantiene historial de acciones para repetir tareas rapido.
- Soporta iconos SVG de libreria o personalizados.
- Incluye selector de scripts/ejecutables y sugerencias automaticas.
- Incluye catalogo de icon packs por categorias con busqueda y filtros (trending, mas descargados, nuevos).

**EN**

- Define buttons with command, URL, and icon.
- Toggle the dashboard with a global shortcut.
- Organize shortcuts for daily workflows.
- Keep command history for fast repetition.
- Support built-in and custom SVG icons.
- Provide script/executable picker with automatic suggestions.
- Include an icon pack catalog by category with search and sort filters.

## Seguridad / Security

**ES:** La ejecucion de comandos esta endurecida para reducir riesgos comunes.

**EN:** Command execution is hardened to reduce common shell-related risks.

- Sin ruta de ejecucion `sh -c`.
- Parseo explicito de `program + args`.
- Bloqueo de caracteres de control de shell: `;`, `|`, `&`, `$`, `` ` ``, `<`, `>`, saltos de linea.
- El programa debe ser:
  - Ruta absoluta, o
  - Uno de los permitidos: `python`, `python3`, `bash`, `node`, `npm`, `pnpm`, `yarn`, `firefox`, `xdg-open`, `code`.

## Stack

- **Frontend**: React + TypeScript
- **Desktop shell**: Tauri (Rust)
- **Package manager**: pnpm

## Instalacion y desarrollo / Setup

### Requisitos

- Node.js
- pnpm
- Rust toolchain
- Dependencias de Tauri para tu sistema operativo

### Instalacion (npm/pnpm)

```bash
# recomendado
pnpm install

# alternativa npm
npm install
```

### Ejecutar en desarrollo

```bash
pnpm install
pnpm tauri dev
```

```bash
# alternativa npm
npm run tauri dev
```

### Build de frontend

```bash
pnpm build
```

### Verificacion de backend (Rust)

```bash
cd src-tauri
cargo check
```

## Build de app y releases

Objetivo: generar paquetes para Linux, macOS y Windows.

Flujo recomendado:

1. Generar build de Tauri.
2. Copiar artefactos resultantes a `releases/`.
3. Versionar solo codigo y assets (no los binarios de release).

### Build local de app

```bash
pnpm tauri build
```

```bash
# alternativa npm
npm run tauri build
```

### Politica de artefactos oficiales (release automatizada)

- **Linux**: `.AppImage` + `.deb`
- **macOS**: `.dmg`
- **Windows**: `.exe` (NSIS)

Esta politica ya esta configurada en `.github/workflows/release.yml` para las proximas versiones etiquetadas (`v*`).

### Artefactos opcionales

Si en el futuro se necesitan, se pueden habilitar tambien:

- Linux: `.rpm`
- macOS: `.app.tar.gz`
- Windows: `.msi`

### Releases GitHub

1. Crear tag de version:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
2. Publicar release y adjuntar artefactos (`.deb`, `.AppImage`, `.dmg`, `.msi`/`.exe`).

Nota: no todos los targets se pueden compilar nativamente en cualquier SO; para publicar todos los formatos se recomienda CI multi-OS (GitHub Actions).

## Assets de documentacion

La carpeta `assets/` contiene recursos visuales versionados (banners, iconos SVG para README, etc.).

Ejemplos actuales:

- `assets/banner-main.svg`
- `assets/banner-features.svg`
- `assets/error.svg`
- `assets/settings.svg`

## Icon packs (catalogo)

El sistema de iconos descargables vive en `assets/icon-packs/` y se organiza asi:

```text
assets/icon-packs/
  index.json
  packs/
    <pack-id>/
      pack.json
      icons/
        *.svg|*.png
```

### Archivos y campos

- `index.json`: indice global de packs y metricas para filtros.
  - `packs[].id`, `name`, `description`
  - `packs[].categories`, `tags`
  - `packs[].downloads`, `trendingScore`, `createdAt`
  - `packs[].coverIcon`, `iconCount`
- `pack.json`: detalle de un pack.
  - `icons[].id`, `name`, `category`
  - `icons[].relativePath`
  - `icons[].tags`, `appHints`
  - `icons[].downloads`, `createdAt`

### Como agregar un nuevo pack

1. Crear carpeta `assets/icon-packs/packs/<nuevo-pack>/`.
2. Agregar `pack.json` con metadata e iconos.
3. Guardar SVG/PNG en `assets/icon-packs/packs/<nuevo-pack>/icons/`.
4. Registrar el pack en `assets/icon-packs/index.json`.
5. Ajustar metricas (`downloads`, `trendingScore`) segun release.

### Como se usa en la app

- En **Settings -> Icons** puedes:
  - Buscar iconos por texto/tags/app hints.
  - Ordenar por `Trending`, `Most downloaded` o `Newest`.
  - Expandir categorias (acordeon) y aplicar iconos a un boton objetivo.
  - Instalar/actualizar packs (estado persistido en config local).
- Los iconos del catalogo se guardan en config como `pack:<pack-id>:<icon-id>`; la app resuelve la ruta del archivo al mostrarlos. Las rutas absolutas y los `lib:<id>` siguen igual.

## Docs extra

- Guia adicional: `docs.md`

## Contributing

Contribuciones son bienvenidas. Para mantener un flujo simple y consistente:

1. Haz un fork o crea una rama nueva desde tu copia local.
2. Instala dependencias y valida que el proyecto corre en local.
3. Implementa cambios pequenos y enfocados.
4. Verifica build y checks antes de abrir tu PR.
5. Describe en la PR el problema, la solucion y como probarla.

Checklist recomendado antes de abrir PR:

- `pnpm install`
- `pnpm build`
- `pnpm tauri dev` (smoke test manual)
- `cd src-tauri && cargo check`

Si agregas assets para documentacion (por ejemplo SVG), guardalos en `assets/`.

## Roadmap

- Perfiles de layouts exportables/importables.
- Marketplace local de atajos preconfigurados.
- Temas visuales y editor de iconos integrado.
