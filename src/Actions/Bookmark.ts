import {
  window,
  Uri,
  TextEditorDecorationType,
  Memento,
  Range,
  DecorationRangeBehavior,
  workspace,
} from 'vscode'

import { MotionLine } from '../Motions/Line'
import { Configuration } from '../Configuration'

import { ActionMoveCursor } from './MoveCursor'

class Mark {
  readonly decorator: TextEditorDecorationType

  constructor(
    public register: string,
    public line: number,
    public column: number,
    public text: string,
  ) {
    const font = workspace.getConfiguration('editor').fontFamily

    this.decorator = window.createTextEditorDecorationType({
      gutterIconPath: Uri.parse(
        `data:image/svg+xml,%3Csvg version='1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' enable-background='new 0 0 48 48'%3E%3Cstyle%3E .heavy %7B font: 42px ${font}; fill: %23${'c5c5c5'}; %7D %3C/style%3E%3Ctext text-anchor='middle' x='24' y='32' class='heavy ass'%3E${register}%3C/text%3E%3C/svg%3E`,
      ),
      overviewRulerColor: '#c5c5c5',
      rangeBehavior: DecorationRangeBehavior.OpenOpen,
    })
  }

  public toJSON(): any {
    return {
      register: this.register,
      line: this.line,
      column: this.column,
      text: this.text,
    }
  }
}

// TODO - Move this to a more generic location
class StringifiableMap<K, V> extends Map<K, V> {
  public toJSON(): any {
    const reduced = {}

    for (const [key, value] of this.entries()) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      reduced[key] = value
    }

    return reduced
  }
}

export class ActionBookmark {
  static stash: StringifiableMap<string, StringifiableMap<string, Mark>> = new StringifiableMap()
  static latestStashSize = 0
  static valid: string[] = '`1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'.split(
    '',
  )

  static save(): Thenable<void> {
    const memento = Configuration.workspaceMemento

    if (!memento || ActionBookmark.stash.size <= 0) return Promise.resolve()

    return memento.update('bookmarks.object', ActionBookmark.stash)
  }

  static load(memento: Memento): Thenable<boolean> {
    const data = memento.get<object>('bookmarks.object')

    if (data === undefined) return Promise.resolve(false)

    for (const [file, marks] of Object.entries(data)) {
      if (!ActionBookmark.stash.has(file)) ActionBookmark.stash.set(file, new StringifiableMap())

      const stash = ActionBookmark.stash.get(file)

      if (!stash) continue

      for (const [register, mark] of Object.entries(marks)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        stash.set(register, new Mark(mark.register, mark.line, mark.column, mark.text))
      }
    }

    return Promise.resolve(true)
  }

  static adjust(fileName: string, mutatedLine: number, delta: number): Thenable<boolean> {
    const stash = ActionBookmark.stash.get(fileName)

    if (stash) {
      for (const mark of stash.values()) {
        if (mark.line === mutatedLine && delta < 0) {
          stash.delete(mark.register)
          mark.decorator.dispose()
          continue
        }

        if (mutatedLine <= mark.line && delta > 0) {
          mark.line += delta
          mark.line < 0 && (mark.line = 0)
          continue
        }

        if (mark.line > mutatedLine && mark.line < mutatedLine + Math.abs(delta)) {
          stash.delete(mark.register)
          mark.decorator.dispose()
          continue
        }

        if (mark.line <= mutatedLine) continue
        mark.line += delta
        mark.line < 0 && (mark.line = 0)
      }
    }

    return Promise.resolve(true)
  }

  static decorate(): Thenable<boolean> {
    const editor = window.activeTextEditor

    if (!editor || !Configuration.showMarksAsDecorations) {
      return Promise.resolve(false)
    }

    const stash = ActionBookmark.stash.get(editor.document.fileName)

    if (stash) {
      for (const mark of stash.values()) {
        editor.setDecorations(mark.decorator, [
          new Range(mark.line, mark.column, mark.line, mark.column),
        ])
      }
    }

    return Promise.resolve(true)
  }

  static toggle(args: { character: string }): Thenable<boolean> {
    const activeTextEditor = window.activeTextEditor

    if (!activeTextEditor) {
      return Promise.resolve(false)
    }

    if (!ActionBookmark.valid.includes(args.character)) {
      return Promise.resolve(false)
    }

    if (!ActionBookmark.stash.has(activeTextEditor.document.fileName)) {
      ActionBookmark.stash.set(activeTextEditor.document.fileName, new StringifiableMap())
    }

    const marks =
      ActionBookmark.stash.get(activeTextEditor.document.fileName) || new StringifiableMap()
    const existing = marks.get(args.character)

    if (existing) {
      existing.decorator.dispose()
      marks.delete(args.character)

      if (activeTextEditor.selection.anchor.line === existing.line) {
        return Promise.resolve(true)
      }
    }

    const selection = activeTextEditor.selection
    const line = activeTextEditor.document.lineAt(selection.anchor)
    const column = selection.anchor.character
    const mark = new Mark(args.character, line.lineNumber, column, line.text)

    marks.set(args.character, mark)

    return Promise.resolve(true)
  }

  static jump(args: { character: string }): Thenable<boolean> {
    const activeTextEditor = window.activeTextEditor

    if (!activeTextEditor) {
      return Promise.resolve(false)
    }

    const marks =
      ActionBookmark.stash.get(activeTextEditor.document.fileName) || new StringifiableMap()
    const mark = marks.get(args.character) as Mark

    if (!mark) {
      return Promise.resolve(false)
    }

    ActionMoveCursor.byMotions({
      motions: [
        MotionLine.absolute({
          n: mark.line - activeTextEditor.selection.anchor.line,
          c: mark.column - activeTextEditor.selection.anchor.character,
        }),
      ],
    })

    return Promise.resolve(true)
  }
}
