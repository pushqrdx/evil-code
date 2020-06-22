import { window, workspace, commands, Disposable, ExtensionContext } from 'vscode'

import * as Keys from './Keys'
import { Mode, ModeID } from './Modes/Mode'
import { ModeNormal } from './Modes/Normal'
import { ModeVisual } from './Modes/Visual'
import { ModeVisualLine } from './Modes/VisualLine'
import { ModeInsert } from './Modes/Insert'
import { ActionMode } from './Actions/Mode'
import { ActionFind } from './Actions/Find'
import { ActionMoveCursor } from './Actions/MoveCursor'
import { Configuration } from './Configuration'
import { StatusBar } from './Utils/StatusBar'
import { ModeReplace } from './Modes/Replace'
import { ActionBookmark } from './Actions/Bookmark'

export class Dispatcher {
  private _currentMode: Mode
  private _bar = new StatusBar()
  private _lineCache = new Map<string, number>()
  private _modeCache = new Map<string, ModeID>()

  get currentMode(): Mode {
    return this._currentMode
  }

  private modes: { [k: string]: Mode } = {
    [ModeID.NORMAL]: new ModeNormal(),
    [ModeID.VISUAL]: new ModeVisual(),
    [ModeID.VISUAL_LINE]: new ModeVisualLine(),
    [ModeID.INSERT]: new ModeInsert(),
    [ModeID.REPLACE]: new ModeReplace(),
  }

  private disposables: Disposable[] = [this._bar]

  constructor(context: ExtensionContext) {
    const memento = context.workspaceState

    Object.keys(this.modes).forEach((key) => {
      const mode = this.modes[key]

      context.subscriptions.push(
        commands.registerCommand(`evil.mode.${mode.id}`, () => {
          this.switchMode(mode.id)
        }),
      )
    })

    context.subscriptions.push(
      commands.registerCommand('type', (args) => {
        this.inputHandler(args.text)()
      }),
    )

    context.subscriptions.push(
      commands.registerCommand('replacePreviousChar', (args) => {
        this.inputHandler(args.text, {
          replaceCharCnt: args.replaceCharCnt,
        })()
      }),
    )

    Keys.raws.forEach((key) => {
      context.subscriptions.push(commands.registerCommand(`evil.${key}`, this.inputHandler(key)))
    })

    context.subscriptions.push(
      commands.registerCommand('evil.executeNativeFind', ActionFind.executeNativeFind),
    )

    ActionBookmark.load(memento)
    ActionBookmark.decorate()
    ActionMoveCursor.updatePreferredColumn()

    this.switchMode(Configuration.defaultModeID)

    this.disposables.push(
      window.onDidChangeTextEditorVisibleRanges((e) => {
        this._lineCache.set(e.textEditor.document.fileName, e.textEditor.document.lineCount)
      }),
      window.onDidChangeTextEditorSelection(() => {
        // Ensure this is executed after all pending commands.
        setTimeout(() => {
          ActionMode.switchByActiveSelections(this._currentMode.id)
          ActionMoveCursor.updatePreferredColumn()
          this._currentMode.onDidChangeTextEditorSelection()
        }, 0)
      }),
      window.onDidChangeActiveTextEditor((e) => {
        ActionMoveCursor.updatePreferredColumn()
        ActionBookmark.decorate()

        if (e?.document) {
          if (this._modeCache.has(e.document.fileName)) {
            this.switchMode(this._modeCache.get(e.document.fileName) || Configuration.defaultModeID)
            return
          }
        }

        if (Configuration.defaultModeID === ModeID.INSERT) {
          ActionMode.toInsert()
        } else {
          // Passing `null` to `currentMode` to force mode switch.
          ActionMode.switchByActiveSelections(null)
        }
      }),
      workspace.onDidChangeTextDocument((e) => {
        if (!e.contentChanges.length) return

        const changed = e.contentChanges[0]?.range.start.line
        const mutatedLine = e.document.lineAt(changed < 0 ? 0 : changed)?.lineNumber
        const delta =
          e.document.lineCount - (this._lineCache.get(e.document.fileName) || e.document.lineCount)

        this._lineCache.set(e.document.fileName, e.document.lineCount)

        if (delta === 0) {
          return
        }

        ActionBookmark.adjust(e.document.fileName, mutatedLine, delta).then(() => {
          ActionBookmark.decorate()
          ActionBookmark.save()
        })
      }),
    )
  }

  private inputHandler(key: string, args: {} = {}): () => void {
    return () => {
      this._currentMode.input(key, args)
    }
  }

  private switchMode(id: ModeID): void {
    const lastMode = this._currentMode

    if (lastMode) {
      lastMode.exit()
    }

    this._currentMode = this.modes[id]
    this._currentMode.enter()
    this._bar.update(`-- ${this._currentMode.name} --`)

    if (window.activeTextEditor) {
      this._modeCache.set(window.activeTextEditor?.document.fileName, id)
    }

    commands.executeCommand('setContext', 'evil.mode', this._currentMode.name)

    // For use in repeat command
    if (lastMode) {
      this._currentMode.onDidRecordFinish(lastMode.recordedCommandMaps, lastMode.id)
    }
  }

  dispose(): void {
    Disposable.from(...this.disposables).dispose()

    Object.keys(this.modes).forEach((id) => {
      this.modes[id].dispose()
    })
  }
}
