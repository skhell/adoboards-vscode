import * as vscode from 'vscode';
import { AdoBoardsState } from '../core/state';
import { reconstructMarkdown } from '../core/diff';

export class AdoboardsQuickDiffProvider implements vscode.QuickDiffProvider {
  constructor(private rootUri: vscode.Uri) {}

  provideOriginalResource(uri: vscode.Uri): vscode.Uri | undefined {
    const relPath = vscode.workspace.asRelativePath(uri);
    if (!relPath.startsWith('areas/') || !relPath.endsWith('.md')) {
      return undefined;
    }
    return vscode.Uri.parse(`adoboards-ref:${relPath}`);
  }
}

export class RefDocumentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private rootUri: vscode.Uri,
    private state: AdoBoardsState
  ) {}

  fireChange(uri: vscode.Uri): void {
    this._onDidChange.fire(uri);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    const relPath = uri.path;
    const refs = this.state.readRefs();

    for (const [id, ref] of Object.entries(refs)) {
      if (ref.path === relPath) {
        return reconstructMarkdown(id, ref.fields);
      }
    }

    return '(no remote state)';
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
