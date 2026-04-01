# XYZ Dashboard

<p align="center">
  <img src="./assets/banner-main.svg" alt="XYZ Dashboard main banner" width="100%" />
</p>

<p align="center">
  <img src="./assets/banner-features.svg" alt="XYZ Dashboard features banner" width="100%" />
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

Floating macro-pad launcher built with **Tauri + React + TypeScript** to run commands and open URLs quickly.

## App Preview

<p align="center">
  <img src="./assets/app-preview.svg" alt="Preview of the XYZ Dashboard app interface" width="100%" />
</p>

### 3x3 With Last Slot Empty

<p align="center">
  <img src="./assets/app-preview-3x3-last-empty.svg" alt="XYZ Dashboard 3x3 preview with icons set and last slot empty" width="100%" />
</p>

### Themes Preview

<p align="center">
  <img src="./assets/themes-preview.svg" alt="Preview of Lime, Cyber, Aurora and Darkmoon themes" width="100%" />
</p>

## Table of Contents

- [What Is It](#what-is-it)
- [Features](#features)
- [Requirements](#requirements)
- [Install and Run](#install-and-run)
- [Build and Releases](#build-and-releases)
- [Repository Layout](#repository-layout)
- [Icon Packs Catalog](#icon-packs-catalog)
- [Documentation Assets (SVG)](#documentation-assets-svg)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

## What Is It

XYZ Dashboard is a floating quick-access panel that centralizes frequent tasks:

- shell commands
- scripts and executables
- URLs
- custom iconized shortcuts

It is designed for users who want a compact, always-on-top launcher workflow.

## Features

- Configurable button grid with per-page sizing.
- Global shortcut to show/hide the dashboard.
- Command history shortcuts in tray menu.
- Script/executable picker with command and icon suggestion.
- Sound effects system with volume/output/test controls.
- Theme presets in Settings: **Lime**, **Cyber**, **Aurora**, **Darkmoon**.
- Multicolor theme mode: combine multiple presets and rotate a slow animated gradient around app borders.
- Settings UX refinements: fixed tabs + smooth internal scroll.
- Settings close/tab transitions hardened to avoid ghosting artifacts.
- Settings scroll reliability fix: proper internal tab scrolling with flex `min-h-0` constraints.
- Uniform visual scaling: full button UI (icon + label + spacing) grows with app scale.
- Linux GNOME audio hardening: layered playback fallbacks for better Debian/WebKit compatibility.
- Icon packs catalog with:
  - install/update actions
  - category accordion
  - search
  - sort by trending/downloads/newest
- Supports three icon sources:
  - built-in library (`lib:<id>`)
  - catalog refs (`pack:<pack-id>:<icon-id>`)
  - absolute file paths (resolved through Tauri file URL conversion)

## Latest Local Build Notes

- New app preview SVGs in README:
  - full app preview
  - 3x3 preview with last slot intentionally empty
  - theme cards preview
- New theme selector cards in Settings -> Appearance.
- New **Multicolor** mode in Settings -> Appearance with multi-select theme blending.
- Icon catalog grid orientation updated for top-to-bottom visual flow.
- Settings content area keeps tabs fixed and scrolls internally with smooth behavior.
- Buttons now scale uniformly when increasing app size percentage.
- Audio playback fallback chain improved for GNOME Debian environments.

## Changelog (Unreleased)

### Added

- Theme presets in Settings: **Lime**, **Cyber**, **Aurora**, **Darkmoon**.
- **Multicolor** theme mode with multi-select preset blending.
- Rotating conic-gradient border animation for multicolor mode.
- App preview SVGs in README:
  - full app preview
  - 3x3 layout preview (last slot empty)
  - themes preview

### Changed

- Icon catalog visual flow in Settings updated to top-to-bottom grid orientation.
- Button visuals now scale uniformly with app size percentage (icon, label, spacing).
- README expanded with current feature set and visual previews.

### Fixed

- Settings panel ghost transition artifacts reduced by simplifying transition flow.
- Internal Settings scrolling in tabs stabilized using proper flex/min-height constraints.
- Audio playback reliability improved on GNOME Debian with layered fallbacks.

## Requirements

- Node.js (recommended modern LTS)
- pnpm
- Rust toolchain
- OS dependencies required by Tauri for your platform

Project versions:

- App version: `0.1.1`
- Frontend package version: `0.1.1`
- Tauri package version: `0.1.1`

## Install and Run

### Install dependencies

```bash
pnpm install
```

### Run in development

```bash
pnpm tauri dev
```

### Frontend build

```bash
pnpm build
```

### Rust backend check

```bash
cd src-tauri
cargo check
```

## Build and Releases

### Local app build

```bash
pnpm tauri build
```

### Release workflow

Release automation is configured in `.github/workflows/release.yml` and is triggered by pushing tags matching `v*`.

Official artifacts:

- Linux: `.AppImage` and `.deb`
- macOS: `.dmg`
- Windows: `.exe` (NSIS)

Create and push a tag:

```bash
git tag v0.1.1
git push origin v0.1.1
```

## Repository Layout

```text
src/                     # React UI, state, hooks, audio, icon catalog
src-tauri/               # Rust backend (commands, shortcuts, window, packaging)
assets/                  # Versioned visual assets + icon packs source
assets/icon-packs/       # Catalog index + packs metadata + svg/png icons
.github/workflows/       # CI/CD workflows (release)
```

## Icon Packs Catalog

Icon packs live in `assets/icon-packs/`:

```text
assets/icon-packs/
  index.json
  packs/
    <pack-id>/
      pack.json
      icons/
        *.svg|*.png
```

Core files:

- `index.json`: global index and ranking metadata (`downloads`, `trendingScore`, `createdAt`, `iconCount`, etc.)
- `pack.json`: per-pack icon list (`id`, `relativePath`, `tags`, `appHints`, etc.)

Usage flow in app:

1. Open **Settings -> Icons**
2. Install or update a pack
3. Pick target button
4. Apply icon
5. Config stores reference as `pack:<pack-id>:<icon-id>`

## Documentation Assets (SVG)

This repository includes multiple SVG assets referenced by this README and by the app:

- `assets/banner-main.svg`
- `assets/banner-features.svg`
- `assets/app-preview.svg`
- `assets/app-preview-3x3-last-empty.svg`
- `assets/themes-preview.svg`
- `assets/error.svg`
- `assets/settings.svg`
- `assets/icon-packs/packs/dev-tools/icons/terminal.svg`
- `assets/icon-packs/packs/apps-brands/icons/browser.svg`
- `assets/icon-packs/packs/system-controls/icons/power.svg`
- `assets/icon-packs/packs/media-social/icons/music.svg`

Preview row:

<p>
  <img src="./assets/settings.svg" alt="Settings icon" width="72" />
  <img src="./assets/error.svg" alt="Error icon" width="72" />
  <img src="./assets/icon-packs/packs/dev-tools/icons/terminal.svg" alt="Terminal icon" width="72" />
  <img src="./assets/icon-packs/packs/apps-brands/icons/browser.svg" alt="Browser icon" width="72" />
  <img src="./assets/icon-packs/packs/system-controls/icons/power.svg" alt="Power icon" width="72" />
  <img src="./assets/icon-packs/packs/media-social/icons/music.svg" alt="Music icon" width="72" />
</p>

## Contributing

1. Create a branch from your local clone.
2. Keep changes scoped and small when possible.
3. Run checks before opening a PR:
   - `pnpm build`
   - `pnpm test`
   - `cd src-tauri && cargo check`
4. In the PR description, include:
   - problem statement
   - implemented solution
   - verification steps

## License

[MIT](LICENSE) — Copyright © Rainbow Technology.

## Roadmap

- Import/export layout profiles.
- Local shortcut presets marketplace.
- More visual themes and icon tooling.
