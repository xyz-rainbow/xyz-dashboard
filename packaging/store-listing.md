# Store listing copy (XYZ Dashboard)

Source icon (vector): `assets/brand/app-icon.svg` (1024×1024-square canvas, Rainbow Technology gradient squircle).

Bundled raster icons are generated into `src-tauri/icons/` via `pnpm exec tauri icon assets/brand/app-icon.svg -o src-tauri/icons`.

## English

| Field | Text |
|--------|------|
| **App name** | XYZ Dashboard |
| **Developer / publisher** | Rainbow Technology |
| **Subtitle / short tagline** | Floating macro-pad for commands & URLs |
| **Short description** (≈80 chars) | Floating macro-pad launcher for commands and URLs — Rainbow Technology. |
| **Full description** | XYZ Dashboard is a compact, always-on-top desktop launcher: map shell commands and URLs to a glassmorphic grid, flip through pages, and summon the window with a global shortcut. Includes downloadable icon packs with usage-based sorting, theme presets (Lime, Cyber, Aurora, Darkmoon) and animated multicolor borders, reliable sound feedback on Linux, per-page grid sizes, window scaling up to 400%, and a tray icon with recent commands. |
| **Keywords** | launcher, macro pad, productivity, command palette, Tauri, Rainbow Technology |
| **What’s new** (template) | See git tag release notes for `vX.Y.Z`. |

## Español

| Campo | Texto |
|--------|------|
| **Nombre** | XYZ Dashboard |
| **Desarrollador / publicador** | Rainbow Technology |
| **Subtítulo** | Macro-pad flotante para comandos y URLs |
| **Descripción breve** | Lanzador flotante tipo macro-pad para comandos y URLs — Rainbow Technology. |
| **Descripción larga** | XYZ Dashboard es un lanzador de escritorio compacto y siempre disponible: asigna comandos de terminal y URLs a una cuadrícula tipo cristal, cambia de página y abre la ventana con un atajo global. Incluye packs de iconos descargables con orden por uso, temas (Lime, Cyber, Aurora, Darkmoon) y bordes multicolor animados, sonidos fiables en Linux, rejilla por página, escala de ventana hasta 400 % e icono de bandeja con comandos recientes. |
| **Palabras clave** | lanzador, macro pad, productividad, comandos, Tauri, Rainbow Technology |

## Debian (.deb)

Control fields are driven by `src-tauri/tauri.conf.json` → `bundle` (`shortDescription`, `longDescription`, `publisher`, `copyright`, `homepage`) and `bundle.linux.deb` (`section`, `depends`, `recommends`). Maintainer field falls back to `Cargo.toml` `authors` if needed.

## Flatpak / Flathub

Use `packaging/com.cloud-xyz.xyz-dashboard.metainfo.xml` as a starting point. Flathub validation usually requires **PNG** screenshots (replace SVG URLs in `<screenshots>` before submission). Bump `<releases>` when you publish a version.

## GitHub Releases

Suggested release title: `XYZ Dashboard vX.Y.Z`. Body: reuse `bundle.longDescription` plus artifact list (.deb, .AppImage, .dmg, .exe).
