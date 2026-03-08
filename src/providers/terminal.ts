import * as vscode from 'vscode';

let terminal: vscode.Terminal | undefined;

function getTerminal(): vscode.Terminal {
  if (terminal && !terminal.exitStatus) {
    return terminal;
  }
  terminal = vscode.window.createTerminal('adoboards');
  return terminal;
}

export function runInTerminal(command: string): void {
  const t = getTerminal();
  t.show();
  t.sendText(command);
}
