import { window, TextEditor, Position } from 'vscode'

import { MatchResultKind } from '../Mappers/Generic'
import { CommandMap } from '../Mappers/Command'
import { ActionInsert } from '../Actions/Insert'
import { ActionSelection } from '../Actions/Selection'
import { ActionMoveCursor } from '../Actions/MoveCursor'
import { ActionNativeEscape } from '../Actions/NativeEscape'
import { ActionMode } from '../Actions/Mode'
import { MotionCharacter } from '../Motions/Character'
import { ActionUnderlineCursor } from '../Actions/UnderlineCursor'
import { ActionReplace } from '../Actions/Replace'
import { ActionHistory } from '../Actions/History'

import { Mode, ModeID } from './Mode'

export class ModeReplace extends Mode {
  id = ModeID.REPLACE
  name = 'REPLACE'

  private maps: CommandMap[] = [
    {
      keys: 'ctrl+c',
      actions: [
        ActionNativeEscape.press,
        () =>
          ActionSelection.shrinkToActives().then((isShrunken) =>
            isShrunken ? Promise.resolve(true) : ActionMode.toNormal(),
          ),
      ],
    },
    {
      keys: 'ctrl+[',
      actions: [
        ActionNativeEscape.press,
        () =>
          ActionSelection.shrinkToActives().then((isShrunken) =>
            isShrunken ? Promise.resolve(true) : ActionMode.toNormal(),
          ),
      ],
    },
    {
      keys: 'escape',
      actions: [
        ActionNativeEscape.press,
        () =>
          ActionSelection.shrinkToActives().then((isShrunken) =>
            isShrunken ? Promise.resolve(true) : ActionMode.toNormal(),
          ),
      ],
    },
  ]

  constructor() {
    super()

    this.maps.forEach((map) => {
      this.mapper.map(map.keys, map.actions, map.args)
    })
  }

  private textEditor?: TextEditor

  enter(): void {
    super.enter()

    ActionUnderlineCursor.on()

    this.textEditor = window.activeTextEditor

    this.startRecord()
  }

  exit(): void {
    super.exit()

    ActionUnderlineCursor.off()

    this.endRecord()

    if (this.textEditor === window.activeTextEditor) {
      ActionMoveCursor.byMotions({ motions: [MotionCharacter.left()] })
    }
  }

  input(key: string): MatchResultKind {
    const matchResultKind = super.input(key)

    // Pass key to built-in command if match failed.
    if (matchResultKind !== MatchResultKind.FAILED) {
      return matchResultKind
    }

    this.startRecord()

    switch (key) {
      case 'space':
        key = ' '
        break

      case 'backspace':
        this.pushCommandMap({
          keys: key,
          actions: [ActionHistory.undo],
          args: {
            character: key,
          },
        })

        this.execute()
        return MatchResultKind.FOUND

      default:
        break
    }

    this.pushCommandMap({
      keys: key,
      actions: [
        ActionReplace.charactersWithCharacter,
        ActionSelection.expandToOne,
        ActionSelection.shrinkToEnds,
      ],
      args: {
        character: key,
      },
    })

    this.execute()

    return MatchResultKind.FOUND
  }

  private isRecording = false
  private recordStartPosition: Position
  private recordStartLineText: string

  private _recordedCommandMaps: CommandMap[]

  get recordedCommandMaps(): CommandMap[] {
    return this._recordedCommandMaps
  }

  private startRecord(): void {
    if (this.isRecording) {
      return
    }

    if (!this.textEditor) {
      return
    }

    this.isRecording = true
    this.recordStartPosition = this.textEditor.selection.active
    this.recordStartLineText = this.textEditor.document.lineAt(this.recordStartPosition.line).text
    this._recordedCommandMaps = []
  }

  private processRecord(): void {
    if (!this.textEditor) {
      return
    }

    const currentLineText = this.textEditor.document.lineAt(this.recordStartPosition.line).text

    let deletionCountBefore = 0
    let deletionCountAfter = 0
    let searchLimit: number

    // Calculate deletion count before.
    searchLimit = Math.min(this.recordStartPosition.character, this.recordStartLineText.length)

    for (let i = 0; i < searchLimit; i++) {
      if (currentLineText.length <= i || currentLineText[i] !== this.recordStartLineText[i]) {
        deletionCountBefore = this.recordStartPosition.character - i
        break
      }
    }

    // Calculate deletion count after;
    const minIndex = this.recordStartPosition.character - deletionCountBefore

    searchLimit = this.recordStartLineText.length - this.recordStartPosition.character + 1

    for (let i = 1; i < searchLimit; i++) {
      const originalIndex = this.recordStartLineText.length - i
      const currentIndex = currentLineText.length - i

      if (
        currentIndex < minIndex ||
        currentLineText[currentIndex] !== this.recordStartLineText[originalIndex]
      ) {
        deletionCountAfter = searchLimit - i
        break
      }
    }

    const inputText = currentLineText.substring(
      this.recordStartPosition.character - deletionCountBefore,
      currentLineText.length -
        (this.recordStartLineText.length - this.recordStartPosition.character - deletionCountAfter),
    )

    if (inputText.length > 0) {
      this._recordedCommandMaps.push({
        keys: '',
        actions: [
          () =>
            ActionMoveCursor.byMotions({
              motions: [
                MotionCharacter.right({
                  n: inputText.length,
                }),
              ],
            }),
          ActionInsert.textAtSelections,
          () =>
            ActionMoveCursor.byMotions({
              motions: [
                MotionCharacter.left({
                  n: inputText.length,
                }),
              ],
            }),
        ],
        args: {
          text: inputText,
          replaceCharCnt: inputText.length,
        },
        isRepeating: true,
      })
    }
  }

  private endRecord(): void {
    if (!this.isRecording) {
      return
    }

    this.isRecording = false

    this.processRecord()
  }

  protected onWillCommandMapMakesChanges(map: CommandMap): Promise<boolean> {
    if (!this.isRecording) {
      return Promise.resolve(false)
    }

    if (map.keys === '\n') {
      this.processRecord()
      this._recordedCommandMaps.push({
        keys: 'enter',
        actions: [ActionInsert.textAtSelections],
        args: {
          text: '\n',
        },
        isRepeating: true,
      })
    }

    return Promise.resolve(true)
  }

  protected onDidCommandMapMakesChanges(map: CommandMap): Promise<boolean> {
    if (!this.isRecording) {
      return Promise.resolve(false)
    }

    if (map.keys === '\n') {
      if (!this.textEditor) {
        return Promise.resolve(false)
      }

      this.recordStartPosition = this.textEditor.selection.active
      this.recordStartLineText = this.textEditor.document.lineAt(this.recordStartPosition.line).text
    }

    return Promise.resolve(true)
  }

  onDidChangeTextEditorSelection(): void {
    if (!this.textEditor) {
      return
    }

    if (this.textEditor.selection.active.line !== this.recordStartPosition.line) {
      this.endRecord()
    }
  }
}
