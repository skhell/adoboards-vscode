import * as vscode from 'vscode';
import { readFileSync, existsSync } from 'fs';
import * as path from 'path';

// --- Types ---

export interface RefEntry {
  path: string;
  rev?: number;
  hash?: string;
  fields: Record<string, any>;
  parent?: number;
}

export interface RefsData {
  [id: string]: RefEntry;
}

export interface ConfigData {
  project: string;
  orgUrl: string;
  lastSync: string;
  areaFilter: string;
  userEmail: string;
}

export interface WorkItemFrontmatter {
  id: number | 'pending';
  type: string;
  title: string;
  area?: string;
  iteration?: string;
  state?: string;
  storyPoints?: number;
  businessValue?: number;
  assignee?: string;
  parent?: string;
  tags?: string[];
  tshirt?: string;
}

// --- State reader ---

export class AdoBoardsState {
  private readonly adoDir: string;

  constructor(private readonly rootUri: vscode.Uri) {
    this.adoDir = path.join(rootUri.fsPath, '.adoboards');
  }

  hasAdoboards(): boolean {
    return existsSync(path.join(this.adoDir, 'config.json'));
  }

  readRefs(): RefsData {
    const filePath = path.join(this.adoDir, 'refs.json');
    if (!existsSync(filePath)) {
      return {};
    }
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  readStaged(): string[] {
    const filePath = path.join(this.adoDir, 'staged.json');
    if (!existsSync(filePath)) {
      return [];
    }
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  readConfig(): ConfigData | null {
    const filePath = path.join(this.adoDir, 'config.json');
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  findRefByPath(relPath: string): { id: string; entry: RefEntry } | null {
    const refs = this.readRefs();
    for (const [id, entry] of Object.entries(refs)) {
      if (entry.path === relPath) {
        return { id, entry };
      }
    }
    return null;
  }

  writeStaged(staged: string[]): void {
    const filePath = path.join(this.adoDir, 'staged.json');
    const { writeFileSync } = require('fs');
    writeFileSync(filePath, JSON.stringify(staged, null, 2) + '\n', 'utf-8');
  }

  stageFile(relPath: string): void {
    const staged = this.readStaged();
    if (!staged.includes(relPath)) {
      staged.push(relPath);
      this.writeStaged(staged);
    }
  }

  unstageFile(relPath: string): void {
    const staged = this.readStaged();
    const idx = staged.indexOf(relPath);
    if (idx !== -1) {
      staged.splice(idx, 1);
      this.writeStaged(staged);
    }
  }
}
