import * as vscode from 'vscode';
import { AdoBoardsState } from '../core/state';
import { isModified } from '../core/diff';
import { existsSync } from 'fs';
import matter from 'gray-matter';
import { readFileSync } from 'fs';

export class AdoboardsDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  constructor(
    private rootUri: vscode.Uri,
    private state: AdoBoardsState
  ) {}

  fireChange(uris?: vscode.Uri[]): void {
    if (uris) {
      this._onDidChangeFileDecorations.fire(uris);
    } else {
      this._onDidChangeFileDecorations.fire(this.rootUri);
    }
  }

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const relPath = vscode.workspace.asRelativePath(uri);

    // Only decorate files under areas/
    if (!relPath.startsWith('areas/') || !relPath.endsWith('.md')) {
      return undefined;
    }

    // Skip .remote.md files
    if (relPath.endsWith('.remote.md')) {
      return undefined;
    }

    const stagedPaths = this.state.readStaged();

    // Staged
    if (stagedPaths.includes(relPath)) {
      return new vscode.FileDecoration(
        'S',
        'Staged',
        new vscode.ThemeColor('gitDecoration.addedResourceForeground')
      );
    }

    // Conflict - has .remote.md counterpart
    const remotePath = uri.fsPath.replace(/\.md$/, '.remote.md');
    if (existsSync(remotePath)) {
      return new vscode.FileDecoration(
        'C',
        'Conflict',
        new vscode.ThemeColor('gitDecoration.conflictingResourceForeground')
      );
    }

    // Parse frontmatter to check pending / modified
    let data: Record<string, any>;
    try {
      const raw = readFileSync(uri.fsPath, 'utf-8');
      const parsed = matter(raw);
      data = parsed.data;
    } catch {
      return undefined;
    }

    if (!data.type) {
      return undefined;
    }

    // Pending
    if (data.id === 'pending') {
      return new vscode.FileDecoration(
        'P',
        'Pending',
        new vscode.ThemeColor('gitDecoration.untrackedResourceForeground')
      );
    }

    // Modified
    const ref = this.state.findRefByPath(relPath);
    if (ref && isModified(data as any, ref.entry.fields)) {
      return new vscode.FileDecoration(
        'M',
        'Modified',
        new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')
      );
    }

    return undefined;
  }

  dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}
