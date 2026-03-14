import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { AdoBoardsState } from '../core/state';
import { existsSync, readFileSync } from 'fs';
import matter from 'gray-matter';
import { isModified } from '../core/diff';

export class AdoboardsDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<undefined | vscode.Uri | vscode.Uri[]>();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  constructor(
    private rootUri: vscode.Uri,
    private state: AdoBoardsState
  ) {}

  fireChange(): void {
    // Fire undefined -> VS Code re-requests decoration for ALL files
    this._onDidChangeFileDecorations.fire(undefined);
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
    let rawContent: string;
    try {
      rawContent = readFileSync(uri.fsPath, 'utf-8');
      const parsed = matter(rawContent);
      data = parsed.data;
    } catch {
      return undefined;
    }

    if (!data.type) {
      return undefined;
    }

    // Pending (new, not yet pushed to ADO)
    if (data.id === 'pending') {
      return new vscode.FileDecoration(
        'P',
        'Pending (new)',
        new vscode.ThemeColor('gitDecoration.untrackedResourceForeground')
      );
    }

    // Modified - use hash if available, fall back to semantic
    const refs = this.state.readRefs();
    let ref = this.state.findRefByPath(relPath);
    if (!ref && data.id != null && data.id !== 'pending') {
      const id = String(data.id);
      if (refs[id]) { ref = { id, entry: refs[id] }; }
    }
    if (ref) {
      let modified: boolean;
      if (ref.entry.hash) {
        const currentHash = crypto.createHash('sha256').update(rawContent!).digest('hex');
        modified = currentHash !== ref.entry.hash;
      } else {
        modified = isModified(data as any, ref.entry.fields);
      }
      if (modified) {
        return new vscode.FileDecoration(
          'M',
          'Modified',
          new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')
        );
      }
    }

    return undefined;
  }

  dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}

