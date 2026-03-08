## Azure DevOps Boards Source Control

This VS Code extension is a companion for the [adoboards](https://www.npmjs.com/package/adoboards) NPM CLI. It provides a visual Source Control-like panel to track, stage, and push your Azure DevOps Boards work items - without leaving the editor.

> **Important:** This extension does not connect to Azure DevOps directly. All remote sync (clone, push, pull) is handled by the [adoboards](https://www.npmjs.com/package/adoboards) CLI. The extension reads the local `.adoboards/` folder and markdown files that the CLI creates.

### Features

- **Source Control sidebar** - dedicated panel with Staged, Modified, Pending, and Conflicts groups
- **Side-by-side diffs** - click any file to see field-level changes vs the last known remote state
- **File explorer badges** - S (staged), M (modified), P (pending), C (conflict) decorations
- **Status bar** - staged count and last sync time at a glance
- **Command palette** - stage, push, pull, diff, report, clone - all from the command palette
- **Stage/unstage inline** - click `+` or `-` directly in the panel for instant feedback

### Getting started

1. Install the CLI globally:
   ```
   npm i -g adoboards
   ```

2. Configure your Azure DevOps connection (PAT token, project, area):
   ```
   adoboards config
   ```

3. Open a workspace folder in VS Code and click the adoboards icon in the Activity Bar

4. Click **Clone Azure DevOps Project** to pull your work items as markdown files

Once cloned, the extension detects the `.adoboards/` folder and activates the Source Control panel, file decorations, and status bar automatically.

### How it works

The CLI manages your Azure DevOps work items as local markdown files with YAML frontmatter. This extension watches those files and the `.adoboards/` state folder to show you what changed, what's staged, and what's pending - the same way Git Source Control tracks your code changes.

- **Stage** a file -> adds it to `.adoboards/staged.json`
- **Push** -> the CLI reads staged files and syncs changes to Azure DevOps
- **Pull** -> the CLI fetches remote updates and writes them to your local files

### Requirements

- [adoboards](https://www.npmjs.com/package/adoboards) CLI installed globally (`npm i -g adoboards`)
- Node.js 18+
- An Azure DevOps organization with a Personal Access Token (configured via `adoboards config`)

---

Less time writing about work, more time doing the work.
If it saves you from one more sprint planning nightmare, it was worth building. Star the project, and if you want, invite me for a coffee.
