import { window, TextDocument, Position, Range } from 'vscode'

import { UtilRange } from '../Utils/Range'
import { getCurrentMode } from '../extension'
import { ModeID } from '../Modes/Mode'

export abstract class TextObject {
  protected readonly shouldExpandToLinewise: boolean = false
  readonly willFindForward: boolean = false

  private _isLinewise = false

  public get isLinewise(): boolean {
    return this._isLinewise
  }

  protected isInclusive: boolean

  /**
   * Override this to return start range of text object or null if not found.
   */
  findStartRange(_: TextDocument, __: Position): Range | null {
    throw new Error('findStartPosition is not implemented.')
  }

  /**
   * Override this to return end range of text object or null if not found.
   */
  findEndRange(_: TextDocument, __: Position): Range | null {
    throw new Error('findEndPosition is not implemented.')
  }

  apply(anchor: Position, last?: Range): Range | null {
    if (this.isInclusive === undefined) {
      throw new Error('isInclusive is not set.')
    }

    const activeTextEditor = window.activeTextEditor

    if (!activeTextEditor) return null

    const document = activeTextEditor.document
    const startRange = this.findStartRange(document, anchor)

    if (startRange === null) return null

    const endRange = this.findEndRange(document, anchor)

    if (endRange === null) return null

    const range = this.createRangeDueToIsInclusive(startRange, endRange)

    let union =
      activeTextEditor.selection.isEmpty ||
      this.isSingleCharSelectionInVisualMode(activeTextEditor.selection)
        ? range
        : activeTextEditor.selection.union(range)

    if (union.isEqual(activeTextEditor.selection)) {
      if (last?.isEqual(union)) return union

      return this.apply(union.start.translate(0, -1), union)
    }

    if (this.shouldExpandToLinewise) {
      union = this.tryExpandToLinewise(union, document)
    }

    return union
  }

  protected isSingleCharSelectionInVisualMode(selection: Range): boolean {
    const visual = getCurrentMode()?.id === ModeID.VISUAL

    return visual && UtilRange.isSingleCharacter(selection)
  }

  protected createRangeDueToIsInclusive(startRange: Range, endRange: Range): Range {
    return this.isInclusive
      ? new Range(startRange.start, endRange.end)
      : new Range(startRange.end, endRange.start)
  }

  private tryExpandToLinewise(range: Range, document: TextDocument): Range {
    if (range.isSingleLine) {
      return range
    }

    const startLine = document.lineAt(range.start.line)
    const endLine = document.lineAt(range.start.line)

    if (this.isInclusive) {
      if (
        range.start.character === startLine.firstNonWhitespaceCharacterIndex &&
        range.end.character === endLine.text.length
      ) {
        range = UtilRange.toLinewise(range, document)
        this._isLinewise = true
      }
    } else {
      if (
        range.start.character === startLine.text.length &&
        range.end.character === endLine.firstNonWhitespaceCharacterIndex
      ) {
        range = new Range(range.start.line + 1, 0, range.end.line, 0)
        this._isLinewise = true
      }
    }

    return range
  }
}
