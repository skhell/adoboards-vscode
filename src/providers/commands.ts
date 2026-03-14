import * as vscode from 'vscode';
import * as path from 'path';
import { AdoBoardsState } from '../core/state';
import { ScmGroups } from './sourceControl';
import { runInTerminal } from './terminal';

export function registerCommands(
  context: vscode.ExtensionContext,
  rootUri: vscode.Uri,
  state: AdoBoardsState,
  scmGroups: ScmGroups
): void {
  function refreshAll() {
    return scmGroups.refresh();
  }
  // Status
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.status', () => {
      runInTerminal('adoboards status');
    })
  );

  // Stage file from SCM panel
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'adoboards.addFile',
      (arg: vscode.SourceControlResourceState) => {
        const relPath = path.relative(rootUri.fsPath, arg.resourceUri.fsPath);
        if (relPath) { state.stageFile(relPath); refreshAll(); }
      }
    )
  );

  // Stage all
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.addAll', () => {
      const allResources = [
        ...scmGroups.modified.resourceStates,
        ...scmGroups.pending.resourceStates,
      ];
      for (const resource of allResources) {
        const relPath = path.relative(rootUri.fsPath, resource.resourceUri.fsPath);
        state.stageFile(relPath);
      }
      refreshAll();
    })
  );

  // Unstage file from SCM panel
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'adoboards.unstageFile',
      (arg: vscode.SourceControlResourceState) => {
        const relPath = path.relative(rootUri.fsPath, arg.resourceUri.fsPath);
        if (relPath) { state.unstageFile(relPath); refreshAll(); }
      }
    )
  );

  // Open diff from active editor
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.diff', () => {
      let relPath: string | undefined;
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      relPath = path.relative(rootUri.fsPath, editor.document.uri.fsPath);
      if (!relPath?.startsWith('areas/') || !relPath.endsWith('.md')) {
        vscode.window.showWarningMessage('Not an adoboards work item file.');
        return;
      }
      vscode.commands.executeCommand(
        'vscode.diff',
        vscode.Uri.parse(`adoboards-ref:${relPath}`),
        vscode.Uri.joinPath(rootUri, relPath),
        `${path.basename(relPath)} (adoboards diff)`
      );
    })
  );

  // Push
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.push', () => {
      runInTerminal('adoboards push');
    })
  );

  // Pull
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.pull', () => {
      runInTerminal('adoboards pull');
    })
  );

  // Refresh
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.refresh', () => {
      refreshAll();
    })
  );

  // Report
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.report', () => {
      runInTerminal('adoboards report');
    })
  );

  // Clone is registered in extension.ts (must work before .adoboards/ exists)
}
