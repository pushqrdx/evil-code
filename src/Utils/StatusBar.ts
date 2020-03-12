import { window, Disposable, StatusBarAlignment } from 'vscode'

export class StatusBar implements Disposable {
  private static item = window.createStatusBarItem(StatusBarAlignment.Left, 10000)

  constructor() {
    StatusBar.item.show()
  }

  update(msg: string): void {
    StatusBar.item.text = msg
  }

  dispose(): void {
    StatusBar.item.dispose()
  }
}
