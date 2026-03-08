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

  // Always register the tree view so the sidebar panel renders welcome content
  context.subscriptions.push(
    vscode.window.createTreeView('adoboards.panel', {
      treeDataProvider: {
        getTreeItem: () => new vscode.TreeItem(''),
        getChildren: () => [],
      },
    })
  );

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

  // Core providers
  const refProvider = new RefDocumentProvider(rootUri, state);
  const decorationProvider = new AdoboardsDecorationProvider(rootUri, state);
  const statusBar = new AdoboardsStatusBar(state);

  // Register virtual document provider for adoboards-ref: scheme
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('adoboards-ref', refProvider)
  );

  // Register file decoration provider
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider)
  );

  // SCM provider
  const scmGroups = createAdoboardsScm(context, rootUri, state);
  scmGroups.scm.quickDiffProvider = new AdoboardsQuickDiffProvider(rootUri);
  context.subscriptions.push({ dispose: () => scmGroups.dispose() });

  // Commands (clone already registered above, registerCommands skips it)
  registerCommands(context, rootUri, state, scmGroups);

  // Status bar
  context.subscriptions.push({ dispose: () => statusBar.dispose() });

  // Refresh function that updates all UI
  async function refreshAll(): Promise<void> {
    await scmGroups.refresh();
    statusBar.update();
    decorationProvider.fireChange();
  }

  // File watchers
  const watcherDisposables = createWatchers(rootUri, {
    onAdoBoardsChanged: () => refreshAll(),
    onWorkItemChanged: () => refreshAll(),
  });
  for (const d of watcherDisposables) {
    context.subscriptions.push(d);
  }

  // Initial load
  refreshAll();
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
