import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { AdoBoardsState } from '../core/state';
import { scanWorkItems, ScannedItem } from '../core/scanner';
import { isModified } from '../core/diff';

// Tree node types

export type GroupId = 'staged' | 'modified' | 'pending' | 'conflicts';

export class GroupNode extends vscode.TreeItem {
  readonly contextValue = 'adoboards.group';
  constructor(
    public readonly groupId: GroupId,
    label: string,
    count: number,
    themeColor: string
  ) {
    super(
      `${label} (${count})`,
      count > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(themeColor));
    this.id = `group-${groupId}`;
  }
}

export class WorkItemNode extends vscode.TreeItem {
  constructor(
    public readonly item: ScannedItem,
    public readonly groupId: GroupId,
    rootUri: vscode.Uri
  ) {
    const label = path.basename(item.relPath);
    const parent = path.dirname(item.relPath).split('/').pop() ?? '';
    const description = parent !== '.' ? parent : undefined;

    super(label, vscode.TreeItemCollapsibleState.None);

    this.description = description;
    this.resourceUri = vscode.Uri.joinPath(rootUri, item.relPath);
    this.tooltip = item.relPath;
    this.id = `wi-${groupId}-${item.relPath}`;
    this.contextValue = `adoboards.item.${groupId}`;

    // Click -> open the file
    this.command = {
      title: 'Open',
      command: 'vscode.open',
      arguments: [this.resourceUri],
    };

    // Status icon
    const iconMap: Record<GroupId, [string, string]> = {
      staged:    ['check',   'gitDecoration.addedResourceForeground'],
      modified:  ['circle-filled', 'gitDecoration.modifiedResourceForeground'],
      pending:   ['add',     'gitDecoration.untrackedResourceForeground'],
      conflicts: ['warning', 'gitDecoration.conflictingResourceForeground'],
    };
    const [icon, color] = iconMap[groupId];
    this.iconPath = new vscode.ThemeIcon(icon, new vscode.ThemeColor(color));
  }
}

export type AdoBoardsTreeNode = GroupNode | WorkItemNode;

// Tree Data Provider

export class WorkItemTreeProvider implements vscode.TreeDataProvider<AdoBoardsTreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<AdoBoardsTreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private groups: Map<GroupId, WorkItemNode[]> = new Map();
  private groupOrder: GroupId[] = ['staged', 'modified', 'pending', 'conflicts'];

  constructor(
    private readonly rootUri: vscode.Uri,
    private readonly state: AdoBoardsState
  ) {}

  async refresh(): Promise<void> {
    await this._rebuild();
    this._onDidChangeTreeData.fire();
  }

  private async _rebuild(): Promise<void> {
    const refs = this.state.readRefs();
    const stagedPaths = new Set(this.state.readStaged());
    const items = await scanWorkItems(this.rootUri);

    const staged: WorkItemNode[] = [];
    const modified: WorkItemNode[] = [];
    const pending: WorkItemNode[] = [];
    const conflicts: WorkItemNode[] = [];

    for (const item of items) {
      if (stagedPaths.has(item.relPath)) {
        staged.push(new WorkItemNode(item, 'staged', this.rootUri));
        continue;
      }
      if (item.hasRemoteConflict) {
        conflicts.push(new WorkItemNode(item, 'conflicts', this.rootUri));
        continue;
      }
      if (item.frontmatter.id === 'pending') {
        pending.push(new WorkItemNode(item, 'pending', this.rootUri));
        continue;
      }

      // Find ref by path or frontmatter id
      let ref = this.state.findRefByPath(item.relPath);
      if (!ref && item.frontmatter.id != null && String(item.frontmatter.id) !== 'pending') {
        const id = String(item.frontmatter.id);
        if (refs[id]) { ref = { id, entry: refs[id] }; }
      }

      if (ref) {
        let changed: boolean;
        if (ref.entry.hash) {
          const hash = crypto.createHash('sha256').update(item.rawContent).digest('hex');
          changed = hash !== ref.entry.hash;
        } else {
          changed = isModified(item.frontmatter, ref.entry.fields);
        }
        if (changed) {
          modified.push(new WorkItemNode(item, 'modified', this.rootUri));
        }
      }
    }

    this.groups.set('staged',    staged);
    this.groups.set('modified',  modified);
    this.groups.set('pending',   pending);
    this.groups.set('conflicts', conflicts);
  }

  getTreeItem(element: AdoBoardsTreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AdoBoardsTreeNode): Promise<AdoBoardsTreeNode[]> {
    if (!element) {
      // Root - return group headers
      if (this.groups.size === 0) { await this._rebuild(); }

      const totalChanges = this.groupOrder.reduce((n, g) => n + (this.groups.get(g)?.length ?? 0), 0);
      if (totalChanges === 0) { return []; }

      const groupMeta: Record<GroupId, { label: string; color: string }> = {
        staged:    { label: 'Staged',    color: 'gitDecoration.addedResourceForeground' },
        modified:  { label: 'Modified',  color: 'gitDecoration.modifiedResourceForeground' },
        pending:   { label: 'New',       color: 'gitDecoration.untrackedResourceForeground' },
        conflicts: { label: 'Conflicts', color: 'gitDecoration.conflictingResourceForeground' },
      };

      return this.groupOrder
        .filter(g => (this.groups.get(g)?.length ?? 0) > 0)
        .map(g => new GroupNode(g, groupMeta[g].label, this.groups.get(g)!.length, groupMeta[g].color));
    }

    if (element instanceof GroupNode) {
      return this.groups.get(element.groupId) ?? [];
    }

    return [];
  }

  totalCount(): number {
    return this.groupOrder.reduce((n, g) => n + (this.groups.get(g)?.length ?? 0), 0);
  }
}
