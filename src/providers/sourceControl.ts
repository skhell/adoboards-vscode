import * as vscode from 'vscode';
import * as path from 'path';
import { AdoBoardsState } from '../core/state';
import { scanWorkItems, ScannedItem } from '../core/scanner';
import { isModified, ItemStatus } from '../core/diff';

export interface ScmGroups {
  scm: vscode.SourceControl;
  staged: vscode.SourceControlResourceGroup;
  modified: vscode.SourceControlResourceGroup;
  pending: vscode.SourceControlResourceGroup;
  conflicts: vscode.SourceControlResourceGroup;
  refresh: () => Promise<void>;
  dispose: () => void;
}

export function createAdoboardsScm(
  context: vscode.ExtensionContext,
  rootUri: vscode.Uri,
  state: AdoBoardsState
): ScmGroups {
  const scm = vscode.scm.createSourceControl('adoboards', 'adoboards', rootUri);

  const staged = scm.createResourceGroup('staged', 'Staged');
  const modified = scm.createResourceGroup('modified', 'Modified');
  const pending = scm.createResourceGroup('pending', 'Pending');
  const conflicts = scm.createResourceGroup('conflicts', 'Conflicts');

  staged.hideWhenEmpty = true;
  conflicts.hideWhenEmpty = true;

  scm.inputBox.visible = false;
  scm.count = 0;

  async function refresh(): Promise<void> {
    const refs = state.readRefs();
    const stagedPaths = state.readStaged();
    const items = await scanWorkItems(rootUri);

    const stagedStates: vscode.SourceControlResourceState[] = [];
    const modifiedStates: vscode.SourceControlResourceState[] = [];
    const pendingStates: vscode.SourceControlResourceState[] = [];
    const conflictStates: vscode.SourceControlResourceState[] = [];

    for (const item of items) {
      const isStagedFile = stagedPaths.includes(item.relPath);

      // Determine status
      let status: ItemStatus;
      if (item.hasRemoteConflict) {
        status = 'conflict';
      } else if (item.frontmatter.id === 'pending') {
        status = 'pending';
      } else {
        const ref = state.findRefByPath(item.relPath);
        if (ref && isModified(item.frontmatter, ref.entry.fields)) {
          status = 'modified';
        } else {
          status = 'clean';
        }
      }

      if (status === 'clean') {
        continue;
      }

      const resourceState = createResourceState(rootUri, item.relPath, status);

      if (isStagedFile) {
        stagedStates.push(resourceState);
      } else if (status === 'conflict') {
        conflictStates.push(resourceState);
      } else if (status === 'pending') {
        pendingStates.push(resourceState);
      } else {
        modifiedStates.push(resourceState);
      }
    }

    staged.resourceStates = stagedStates;
    modified.resourceStates = modifiedStates;
    pending.resourceStates = pendingStates;
    conflicts.resourceStates = conflictStates;

    scm.count =
      stagedStates.length +
      modifiedStates.length +
      pendingStates.length +
      conflictStates.length;
  }

  function dispose(): void {
    scm.dispose();
  }

  return { scm, staged, modified, pending, conflicts, refresh, dispose };
}

function createResourceState(
  rootUri: vscode.Uri,
  relPath: string,
  status: ItemStatus
): vscode.SourceControlResourceState {
  const uri = vscode.Uri.joinPath(rootUri, relPath);

  const iconMap: Record<string, vscode.ThemeIcon> = {
    staged: new vscode.ThemeIcon('check', new vscode.ThemeColor('gitDecoration.addedResourceForeground')),
    modified: new vscode.ThemeIcon('edit', new vscode.ThemeColor('gitDecoration.modifiedResourceForeground')),
    pending: new vscode.ThemeIcon('add', new vscode.ThemeColor('gitDecoration.untrackedResourceForeground')),
    conflict: new vscode.ThemeIcon('warning', new vscode.ThemeColor('gitDecoration.conflictingResourceForeground')),
  };

  const decorations: vscode.SourceControlResourceDecorations = {
    tooltip: status,
    strikeThrough: status === 'conflict',
    faded: false,
    iconPath: iconMap[status],
  };

  return {
    resourceUri: uri,
    decorations,
    command: {
      title: 'Show changes',
      command: 'vscode.diff',
      arguments: [
        vscode.Uri.parse(`adoboards-ref:${relPath}`),
        uri,
        `${path.basename(relPath)} (adoboards diff)`,
      ],
    },
  };
}
