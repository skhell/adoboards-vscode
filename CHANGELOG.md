# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-08

### Added
- Project scaffolding: package.json, tsconfig.json, esbuild config, .vscodeignore, .gitignore
- core/state.ts - read/write refs.json, staged.json, config.json with stage/unstage support
- core/scanner.ts - scan areas/ for .md work item files, parse frontmatter with gray-matter
- core/diff.ts - compare frontmatter vs refs.json fields, reconstruct markdown for diff view
- core/watcher.ts - FileSystemWatcher for .adoboards/ and areas/ changes
- providers/sourceControl.ts - SCM provider with Staged, Modified, Pending, Conflicts groups
- providers/quickDiff.ts - QuickDiff provider with virtual ref document for side-by-side diffs
- providers/decorations.ts - file explorer badges (S/M/P/C) with themed colors
- providers/statusBar.ts - status bar showing staged count and last sync time
- providers/commands.ts - command palette: status, stage, unstage, push, pull, diff, report, clone
- extension.ts - activate/deactivate wiring with full refresh on file changes
- Dark/light sidebar icons for Activity Bar
- Sidebar welcome panel with getting started instructions and clone button
- Clone command works before .adoboards/ exists (onView activation)
- Shared terminal helper (providers/terminal.ts)
- VS Code launch/tasks config for F5 debugging
- README with features, getting started guide, and how it works