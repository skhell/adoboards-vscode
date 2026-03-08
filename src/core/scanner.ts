import * as vscode from 'vscode';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { WorkItemFrontmatter } from './state';

export interface ScannedItem {
  relPath: string;
  uri: vscode.Uri;
  frontmatter: WorkItemFrontmatter;
  body: string;
  hasRemoteConflict: boolean;
}

export async function scanWorkItems(rootUri: vscode.Uri): Promise<ScannedItem[]> {
  const areasUri = vscode.Uri.joinPath(rootUri, 'areas');
  const pattern = new vscode.RelativePattern(areasUri, '**/*.md');
  const files = await vscode.workspace.findFiles(pattern);

  const items: ScannedItem[] = [];

  for (const fileUri of files) {
    const relPath = path.relative(rootUri.fsPath, fileUri.fsPath);

    // Skip .remote.md conflict files from the item list
    if (relPath.endsWith('.remote.md')) {
      continue;
    }

    const parsed = parseWorkItemFile(fileUri.fsPath);
    if (!parsed) {
      continue;
    }

    // Check if a .remote.md counterpart exists (conflict)
    const remotePath = fileUri.fsPath.replace(/\.md$/, '.remote.md');
    const hasRemoteConflict = existsSync(remotePath);

    items.push({
      relPath,
      uri: fileUri,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      hasRemoteConflict,
    });
  }

  return items;
}

function parseWorkItemFile(
  filePath: string
): { frontmatter: WorkItemFrontmatter; body: string } | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);

    // Must have at least id and type to be a valid work item
    if (!data.type) {
      return null;
    }

    return {
      frontmatter: data as WorkItemFrontmatter,
      body: content.trim(),
    };
  } catch {
    return null;
  }
}
