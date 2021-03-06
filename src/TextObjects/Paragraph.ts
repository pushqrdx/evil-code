import { TextDocument, Position, Range } from 'vscode'

import { TextObject } from './TextObject'

export class TextObjectParagraph extends TextObject {
  protected readonly shouldExpandToLinewise = false

  static byParagraph(args: { isInclusive: boolean }): TextObject {
    const obj = new TextObjectParagraph()

    obj.isInclusive = args.isInclusive

    return obj
  }

  findStartRange(document: TextDocument, anchor: Position): Range | null {
    const line = document.lineAt(anchor.line)

    if (!line.isEmptyOrWhitespace && anchor.line > 0) {
      return this.findStartRange(document, new Position(anchor.line - 1, 0))
    }

    return line.rangeIncludingLineBreak
  }

  findEndRange(document: TextDocument, anchor: Position): Range | null {
    const line = document.lineAt(anchor.line)

    if (!line.isEmptyOrWhitespace && anchor.line + 1 < document.lineCount) {
      return this.findEndRange(document, new Position(anchor.line + 1, 0))
    }

    return line.rangeIncludingLineBreak
  }
}
