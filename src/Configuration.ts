import {
  commands,
  window,
  workspace,
  WorkspaceConfiguration,
  Disposable,
  Memento,
  ExtensionContext,
} from 'vscode'

import { ModeID } from './Modes/Mode'
import { UtilWord } from './Utils/Word'

export class Configuration {
  private static isReady = false
  private static extensionNamespace: WorkspaceConfiguration
  private static editorNamespace: WorkspaceConfiguration
  private static disposables: Disposable[] = []
  private static _defaultModeID: ModeID

  static get defaultModeID(): ModeID {
    return this._defaultModeID
  }

  private static _smartRelativeLineNumbers: boolean

  static get smartRelativeLineNumbers(): boolean {
    return this._smartRelativeLineNumbers
  }

  private static _useSystemClipboard: boolean

  static get useSystemClipboard(): boolean {
    return this._useSystemClipboard
  }

  private static _showMarksAsDecorations: boolean

  static get showMarksAsDecorations(): boolean {
    return this._showMarksAsDecorations
  }

  private static _marksGutterForeground: string

  static get marksGutterForeground(): string {
    return this._marksGutterForeground
  }

  private static _workspaceMemento: Memento

  static get workspaceMemento(): Memento {
    return this._workspaceMemento
  }

  private static _globalMemento: Memento

  static get globalMemento(): Memento {
    return this._globalMemento
  }

  static init(context: ExtensionContext): void {
    if (this.isReady) {
      return
    }

    this._workspaceMemento = context.workspaceState
    this._globalMemento = context.globalState
    this.isReady = true
    this.onDidChangeConfiguration()
    this.disposables.push(workspace.onDidChangeConfiguration(() => this.onDidChangeConfiguration()))
  }

  private static onDidChangeConfiguration(): void {
    this.updateCache()
    this.updateKeybindingContexts()

    this._defaultModeID = this.getExtensionSetting<boolean>('startInInsertMode', false)
      ? ModeID.INSERT
      : ModeID.NORMAL

    this._smartRelativeLineNumbers = this.getExtensionSetting<boolean>(
      'smartRelativeLineNumbers',
      false,
    )

    this._useSystemClipboard = this.getExtensionSetting<boolean>('useSystemClipboard', false)

    this._marksGutterForeground = this.getExtensionSetting<string>(
      'marksGutterForeground',
      '#c5c5c5',
    )

    this._showMarksAsDecorations = this.getExtensionSetting<boolean>(
      'showMarksAsDecorations',
      false,
    )

    UtilWord.updateCharacterKindCache(
      this.getEditorSetting<string>('wordSeparators', '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?'),
    )
  }

  private static updateCache(): void {
    this.extensionNamespace = workspace.getConfiguration('evil')
    this.editorNamespace = workspace.getConfiguration('editor')
  }

  private static updateKeybindingContexts(): void {
    commands.executeCommand(
      'setContext',
      'evil.configuration.shouldBindCtrlCommands',
      this.getExtensionSetting<boolean>('bindCtrlCommands', true),
    )
    commands.executeCommand(
      'setContext',
      'evil.configuration.shouldMimicVimSearchBehavior',
      this.getExtensionSetting<boolean>('mimicVimSearchBehavior', true),
    )
    commands.executeCommand(
      'setContext',
      'evil.configuration.shouldUseVimStyleNavigationInListView',
      this.getExtensionSetting<boolean>('vimStyleNavigationInListView', true),
    )
  }

  static getExtensionSetting<T>(section: string, defaultValue: T): T {
    return this.extensionNamespace.get<T>(section, defaultValue)
  }

  static getEditorSetting<T>(section: string, defaultValue: T): T {
    return this.editorNamespace.get<T>(section, defaultValue)
  }

  /**
   * Remarks: Workaround undefined bug in native API.
   */
  static getInsertSpace(): boolean {
    if (window.activeTextEditor) {
      const options = window.activeTextEditor.options

      if (options.insertSpaces !== undefined) {
        return options.insertSpaces as boolean
      }
    }

    return this.getEditorSetting<boolean>('insertSpaces', true)
  }

  /**
   * Remarks: Workaround undefined bug in native API.
   */
  static getTabSize(): number {
    if (window.activeTextEditor) {
      const options = window.activeTextEditor.options

      if (options.tabSize !== undefined) {
        return options.tabSize as number
      }
    }

    return this.getEditorSetting<number>('tabSize', 4)
  }

  static dispose(): void {
    Disposable.from(...this.disposables).dispose()
  }
}
