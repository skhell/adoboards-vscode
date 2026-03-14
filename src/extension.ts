import * as vscode from 'vscode';
import { AdoBoardsState } from './core/state';
import { createWatchers } from './core/watcher';
import { createAdoboardsScm } from './providers/sourceControl';
import { AdoboardsQuickDiffProvider, RefDocumentProvider } from './providers/quickDiff';
import { AdoboardsDecorationProvider } from './providers/decorations';
import { AdoboardsStatusBar } from './providers/statusBar';
import { registerCommands } from './providers/commands';
import { runInTerminal } from './providers/terminal';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  // Always register clone command so the welcome button works
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.clone', () => {
      runInTerminal('adoboards clone');
    })
  );

  if (!workspaceFolder) {
    vscode.commands.executeCommand('setContext', 'adoboards.active', false);
    return;
  }

  const rootUri = workspaceFolder.uri;
  const state = new AdoBoardsState(rootUri);

  if (!state.hasAdoboards()) {
    vscode.commands.executeCommand('setContext', 'adoboards.active', false);
    return;
  }

  vscode.commands.executeCommand('setContext', 'adoboards.active', true);

  // Work Item Tree (the sidebar panel)
  const treeProvider = new WorkItemTreeProvider(rootUri, state);
  const treeView = vscode.window.createTreeView('adoboards.panel', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Other providers
  const refProvider = new RefDocumentProvider(rootUri, state);
  const decorationProvider = new AdoboardsDecorationProvider(rootUri, state);
  const statusBar = new AdoboardsStatusBar(state);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('adoboards-ref', refProvider)
  );
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider)
  );

  // SCM panel
  const scmGroups = createAdoboardsScm(context, rootUri, state);
  scmGroups.scm.quickDiffProvider = new AdoboardsQuickDiffProvider(rootUri);
  context.subscriptions.push({ dispose: () => scmGroups.dispose() });

  // Commands
  registerCommands(context, rootUri, state, scmGroups, treeProvider);

  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  // Refresh everything
  async function refreshAll(): Promise<void> {
    await Promise.all([scmGroups.refresh(), treeProvider.refresh()]);
    statusBar.update();
    decorationProvider.fireChange();

    // Update tree title with change count
    const count = treeProvider.totalCount();
    treeView.title = count > 0 ? `adoboards (${count})` : 'adoboards';
  }

  // File watchers
  const watcherDisposables = createWatchers(rootUri, {
    onAdoBoardsChanged: () => refreshAll(),
    onWorkItemChanged:  () => refreshAll(),
  });
  for (const d of watcherDisposables) {
    context.subscriptions.push(d);
  }

  // Also refresh immediately on save (faster than OS file watcher on macOS)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const rel = vscode.workspace.asRelativePath(doc.uri);
      if (rel.startsWith('areas/') && rel.endsWith('.md')) {
        refreshAll();
      }
    })
  );

  refreshAll();
}

export function deactivate(): void {}

