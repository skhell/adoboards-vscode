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
  // Status
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.status', () => {
      runInTerminal('adoboards status');
    })
  );

  // Stage file (inline action on SCM resource)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'adoboards.addFile',
      (resource: vscode.SourceControlResourceState) => {
        if (resource?.resourceUri) {
          const relPath = path.relative(rootUri.fsPath, resource.resourceUri.fsPath);
          state.stageFile(relPath);
        }
      }
    )
  );

  // Stage all (inline action on resource group)
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
    })
  );

  // Unstage file (inline action on staged resource)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'adoboards.unstageFile',
      (resource: vscode.SourceControlResourceState) => {
        if (resource?.resourceUri) {
          const relPath = path.relative(rootUri.fsPath, resource.resourceUri.fsPath);
          state.unstageFile(relPath);
        }
      }
    )
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
      scmGroups.refresh();
    })
  );

  // Diff (open for current file)
  context.subscriptions.push(
    vscode.commands.registerCommand('adoboards.diff', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const relPath = path.relative(rootUri.fsPath, editor.document.uri.fsPath);
      if (!relPath.startsWith('areas/') || !relPath.endsWith('.md')) {
        vscode.window.showWarningMessage('Not an adoboards work item file.');
        return;
      }
      vscode.commands.executeCommand(
        'vscode.diff',
        vscode.Uri.parse(`adoboards-ref:${relPath}`),
        editor.document.uri,
        `${path.basename(relPath)} (adoboards diff)`
      );
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
