import { GenericMapper, GenericMap, RecursiveMap, MatchResultKind } from '../Generic'
import { TextObject } from '../../TextObjects/TextObject'
import { TextObjectBlock } from '../../TextObjects/Block'
import { TextObjectQuotedString } from '../../TextObjects/QuotedString'
import { TextObjectWord } from '../../TextObjects/Word'
import { TextObjectTag } from '../../TextObjects/Tag'

import { SpecialKeyCommon, SpecialKeyMatchResult } from './Common'

interface TextObjectGenerator {
  (args?: {}): TextObject
}

interface TextObjectMap extends GenericMap {
  textObjectGenerator: TextObjectGenerator
}

interface TextObjectMapInfo {
  characters: string[]
  method: (args: { isInclusive: boolean }) => TextObject
  args?: {}
}

export class SpecialKeyTextObject extends GenericMapper implements SpecialKeyCommon {
  indicator = '{textObject}'

  private conflictRegExp = /^[ai]|\{char\}$/

  private mapInfos: TextObjectMapInfo[] = [
    {
      characters: ['b', '(', ')'],
      method: TextObjectBlock.byParentheses,
    },
    {
      characters: ['[', ']'],
      method: TextObjectBlock.byBrackets,
    },
    {
      characters: ['B', '{', '}'],
      method: TextObjectBlock.byBraces,
    },
    {
      characters: ['<', '>'],
      method: TextObjectBlock.byChevrons,
    },
    {
      characters: ["'"],
      method: TextObjectQuotedString.bySingle,
    },
    {
      characters: ['"'],
      method: TextObjectQuotedString.byDouble,
    },
    {
      characters: ['`'],
      method: TextObjectQuotedString.byBackward,
    },
    {
      characters: ['t'],
      method: TextObjectTag.byTag,
    },
    {
      characters: ['w'],
      method: TextObjectWord.byWord,
      args: { useBlankSeparatedStyle: false },
    },
    {
      characters: ['W'],
      method: TextObjectWord.byWord,
      args: { useBlankSeparatedStyle: true },
    },
  ]

  private maps: TextObjectMap[] = [
    // Reserved for special maps.
  ]

  constructor() {
    super()

    this.mapInfos.forEach((mapInfo) => {
      mapInfo.characters.forEach((character) => {
        this.map(
          `a ${character}`,
          mapInfo.method,
          Object.assign({}, mapInfo.args, { isInclusive: true }),
        )
        this.map(
          `i ${character}`,
          mapInfo.method,
          Object.assign({}, mapInfo.args, { isInclusive: false }),
        )
      })
    })

    this.maps.forEach((map) => {
      this.map(map.keys, map.textObjectGenerator, map.args)
    })
  }

  map(joinedKeys: string, textObjectGenerator: TextObjectGenerator, args?: {}): void {
    const map = super.map(joinedKeys, args)
      // eslint-disable-next-line padding-line-between-statements
    ;(map as TextObjectMap).textObjectGenerator = textObjectGenerator
  }

  unmapConflicts(node: RecursiveMap, keyToMap: string): void {
    if (keyToMap === this.indicator) {
      Object.getOwnPropertyNames(node).forEach((key) => {
        this.conflictRegExp.test(key) && delete node[key]
      })
    }

    if (this.conflictRegExp.test(keyToMap)) {
      delete node[this.indicator]
    }

    // This class has lower priority than other keys.
  }

  matchSpecial(
    inputs: string[],
    additionalArgs: { [key: string]: any },
    _?: SpecialKeyMatchResult,
  ): SpecialKeyMatchResult | null {
    const { kind, map } = this.match(inputs)

    if (kind === MatchResultKind.FAILED) {
      return null
    }

    if (map) {
      additionalArgs.textObject = (map as TextObjectMap).textObjectGenerator(map.args)
    }

    return {
      specialKey: this,
      kind,
      matchedCount: inputs.length,
    }
  }
}
