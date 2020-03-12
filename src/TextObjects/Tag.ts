import { Range } from 'vscode'

import { selectTag } from '../Utils/Emmet'

import { TextObject } from './TextObject'

export class TextObjectTag extends TextObject {
  readonly willFindForward = true
  range: Range[]

  constructor() {
    super()

    this.range = selectTag()
  }

  static byTag(args: { isInclusive: boolean }): TextObject {
    const obj = new TextObjectTag()

    obj.isInclusive = args.isInclusive
    return obj
  }

  findStartRange(): Range | null {
    if (this.range.length) return this.range[0]

    return null
  }

  findEndRange(): Range | null {
    if (this.range.length) return this.range[this.range.length - 1]

    return null
  }
}
