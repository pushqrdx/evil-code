import { commands } from 'vscode'

export class ActionScroll {
  static up(): Thenable<boolean | undefined> {
    return commands.executeCommand('editorScroll', { to: 'up', by: 'line', revealCursor: false })
  }

  static down(): Thenable<boolean | undefined> {
    return commands.executeCommand('editorScroll', { to: 'down', by: 'line', revealCursor: false })
  }
}
