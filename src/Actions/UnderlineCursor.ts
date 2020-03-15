import { window, TextEditorCursorStyle } from 'vscode'

export class ActionUnderlineCursor {
  static on(): Thenable<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const activeTextEditor = window.activeTextEditor

        if (!activeTextEditor) {
          return Promise.resolve(false)
        }

        activeTextEditor.options.cursorStyle = TextEditorCursorStyle.Underline

        resolve(true)
      }, 0)
    })
  }

  static off(): Thenable<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const activeTextEditor = window.activeTextEditor

        if (!activeTextEditor) {
          return Promise.resolve(false)
        }

        activeTextEditor.options.cursorStyle = TextEditorCursorStyle.Line

        resolve(true)
      }, 0)
    })
  }
}
