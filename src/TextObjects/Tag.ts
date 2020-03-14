import { Range, Position, TextDocument, window } from 'vscode'

import { selectTag } from '../Utils/Emmet'

import { TextObject } from './TextObject'

export class TextObjectTag extends TextObject {
  readonly willFindForward = true
  protected readonly shouldExpandToLinewise = true
  range: Range[]
  anchor: Position

  constructor() {
    super()

    if (window.activeTextEditor) {
      this.anchor = window.activeTextEditor.selection.start
      this.range = selectTag(this.anchor)
    }
  }

  static byTag(args: { isInclusive: boolean }): TextObject {
    const obj = new TextObjectTag()

    obj.isInclusive = args.isInclusive
    return obj
  }

  findStartRange(_: TextDocument, anchor: Position): Range | null {
    // only reparse if cursor moved
    if (!anchor.isEqual(this.anchor)) this.range = selectTag(anchor)
    if (this.range.length) return this.range[0]

    return null
  }

  findEndRange(): Range | null {
    if (this.range.length) return this.range[this.range.length - 1]

    return null
  }
}
