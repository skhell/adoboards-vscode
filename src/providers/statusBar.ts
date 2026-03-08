import * as vscode from 'vscode';
import { AdoBoardsState } from '../core/state';

export class AdoboardsStatusBar {
  private item: vscode.StatusBarItem;

  constructor(private state: AdoBoardsState) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'workbench.view.scm';
    this.item.name = 'adoboards';
  }

  update(): void {
    const staged = this.state.readStaged();
    const config = this.state.readConfig();

    const parts: string[] = [`$(checklist) adoboards: ${staged.length} staged`];

    if (config?.lastSync) {
      const syncDate = new Date(config.lastSync);
      parts.push(`$(sync) ${formatRelativeTime(syncDate)}`);
    }

    this.item.text = parts.join('  ');
    this.item.tooltip = config?.lastSync
      ? `Last sync: ${config.lastSync}`
      : 'adoboards - no sync yet';
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
