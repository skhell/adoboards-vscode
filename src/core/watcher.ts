import * as vscode from 'vscode';

export interface WatcherCallbacks {
  onAdoBoardsChanged: () => void;
  onWorkItemChanged: () => void;
}

export function createWatchers(
  rootUri: vscode.Uri,
  callbacks: WatcherCallbacks
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Watch .adoboards/ folder for refs.json, staged.json, config.json changes
  const adoPattern = new vscode.RelativePattern(rootUri, '.adoboards/*.json');
  const adoWatcher = vscode.workspace.createFileSystemWatcher(adoPattern);

  adoWatcher.onDidChange(callbacks.onAdoBoardsChanged);
  adoWatcher.onDidCreate(callbacks.onAdoBoardsChanged);
  adoWatcher.onDidDelete(callbacks.onAdoBoardsChanged);
  disposables.push(adoWatcher);

  // Watch areas/ folder for work item .md file changes
  const areasPattern = new vscode.RelativePattern(rootUri, 'areas/**/*.md');
  const areasWatcher = vscode.workspace.createFileSystemWatcher(areasPattern);

  areasWatcher.onDidChange(callbacks.onWorkItemChanged);
  areasWatcher.onDidCreate(callbacks.onWorkItemChanged);
  areasWatcher.onDidDelete(callbacks.onWorkItemChanged);
  disposables.push(areasWatcher);

  return disposables;
}
