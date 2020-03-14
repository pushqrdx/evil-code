import { TextDocument, Position, Range } from 'vscode'

import { TextObject } from './TextObject'

interface Character {
  value: string
  offset: number
  line: number
}

class Pairs {
  private pairs = {
    '{': '}',
    '[': ']',
    '(': ')',
  }

  matches(opening: string, closing: string): boolean {
    const c = closing
    const o = this.pairs[opening]

    return c === o
  }
}

export class TextObjectAnyBlock extends TextObject {
  protected readonly shouldExpandToLinewise = false

  private pairs = new Pairs()
  private openingCharacters: string[] = ['[', '{', '(']
  private closingCharacters: string[] = [']', '}', ')']
  private singleLine = false

  private stack: Array<Character> = []

  private openingCharacter: Character | null = null
  private closingCharacter: Character | null = null

  static byBlock(args: { isInclusive: boolean; singleLine: boolean }): TextObject {
    const obj = new TextObjectAnyBlock()

    obj.isInclusive = args.isInclusive
    obj.singleLine = args.singleLine

    return obj
  }

  findStartRange(document: TextDocument, anchor: Position): Range | null {
    const line = document.lineAt(anchor.line)
    const num = line.lineNumber
    const text = line.text.split('')
    const length = anchor.character || text.length

    for (let i = length; i >= 0; i--) {
      const c = text[i]

      if (!c) continue

      if (this.closingCharacters.includes(c)) {
        this.stack.push({
          value: c,
          offset: i,
          line: num,
        })
        continue
      }

      if (this.openingCharacters.includes(c) && this.stack.length === 0) {
        this.openingCharacter = {
          value: c,
          offset: i,
          line: num,
        }
        break
      }

      if (this.stack.length) {
        const tip = this.stack[this.stack.length - 1].value

        if (this.pairs.matches(c, tip)) {
          this.stack.pop()
        }
      }
    }

    if (this.openingCharacter === null && num > 0 && !this.singleLine) {
      return this.findStartRange(document, new Position(num - 1, 0))
    }

    if (this.openingCharacter) {
      this.stack = []

      return new Range(
        this.openingCharacter.line,
        this.openingCharacter.offset,
        this.openingCharacter.line,
        this.openingCharacter.offset + 1,
      )
    }

    return null
  }

  findEndRange(document: TextDocument, anchor: Position, recursive?: boolean): Range | null {
    if (this.openingCharacter === null) {
      return null
    }

    const line = document.lineAt(recursive ? anchor.line : this.openingCharacter.line)
    const num = line.lineNumber
    const text = line.text.split('')
    const offset = recursive ? anchor.character : this.openingCharacter.offset

    for (let i = offset; i < text.length; i++) {
      const c = text[i]

      if (!c || c.length === 0) continue

      if (this.openingCharacters.includes(c)) {
        this.stack.push({
          value: c,
          offset: i,
          line: num,
        })
        continue
      }

      if (this.stack.length) {
        const tip = this.stack[this.stack.length - 1].value

        if (this.pairs.matches(tip, c)) {
          this.stack.pop()
        }
      }

      if (this.pairs.matches(this.openingCharacter.value, c) && this.stack.length === 0) {
        this.closingCharacter = {
          value: c,
          offset: i,
          line: num,
        }
        break
      }
    }

    if (this.closingCharacter === null && num < document.lineCount && !this.singleLine) {
      return this.findEndRange(document, new Position(num + 1, 0), true)
    }

    if (this.closingCharacter) {
      return new Range(
        this.closingCharacter.line,
        this.closingCharacter.offset,
        this.closingCharacter.line,
        this.closingCharacter.offset + 1,
      )
    }

    return null
  }
}
