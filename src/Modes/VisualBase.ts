import { window, TextEditorRevealType } from 'vscode'

import { StaticReflect } from '../LanguageExtensions/StaticReflect'
import { SymbolMetadata } from '../Symbols/Metadata'
import { RangeOffset } from '../Types/RangeOffset'
import { Configuration } from '../Configuration'
import { CommandMap } from '../Mappers/Command'
import { ActionRelativeLineNumbers } from '../Actions/RelativeLineNumbers'
import { ActionMoveCursor } from '../Actions/MoveCursor'
import { ActionSelection } from '../Actions/Selection'
import { ActionDelete } from '../Actions/Delete'
import { ActionInsert } from '../Actions/Insert'
import { ActionReplace } from '../Actions/Replace'
import { ActionCase } from '../Actions/Case'
import { ActionFilter } from '../Actions/Filter'
import { ActionNativeEscape } from '../Actions/NativeEscape'
import { ActionMode } from '../Actions/Mode'
import { MotionLine } from '../Motions/Line'
import { ActionCommandLine } from '../Actions/CommandLine'
import { ActionReveal } from '../Actions/Reveal'
import { ActionFold } from '../Actions/Fold'

import { Mode, ModeID } from './Mode'

export class ModeVisualBase extends Mode {
  protected maps: CommandMap[] = [
    {
      keys: 'o',
      actions: [ActionSelection.flipAnchor],
    },
    {
      keys: 'O',
      actions: [ActionSelection.flipAnchor],
    },
    {
      keys: 'I',
      actions: [ActionSelection.shrinkToStarts, ActionMode.toInsert],
    },
    {
      keys: 'A',
      actions: [ActionSelection.shrinkToEnds, ActionMode.toInsert],
    },
    {
      keys: 'X',
      actions: [ActionDelete.byLines],
      args: { shouldYank: true },
    },
    {
      keys: 'D',
      actions: [ActionDelete.byLines],
      args: { shouldYank: true },
    },
    {
      keys: 'C',
      actions: [ActionDelete.byLines, ActionInsert.newLineBefore, ActionMode.toInsert],
      args: { shouldYank: true },
    },
    {
      keys: 'S',
      actions: [ActionDelete.byLines, ActionInsert.newLineBefore, ActionMode.toInsert],
      args: { shouldYank: true },
    },
    {
      keys: 'r {char}',
      actions: [ActionReplace.selectionsWithCharacter, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'R',
      actions: [
        () =>
          ActionMoveCursor.byMotions({
            motions: [MotionLine.firstNonBlank()],
          }),
        ActionDelete.byMotions,
        ActionMode.toInsert,
      ],
      args: {
        motions: [MotionLine.end()],
        shouldYank: true,
      },
    },
    {
      keys: '~',
      actions: [ActionCase.switchSelections, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'u',
      actions: [ActionCase.lowercaseSelections, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'U',
      actions: [ActionCase.uppercaseSelections, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'g ?',
      actions: [ActionCase.rot13Selections, ActionSelection.shrinkToStarts],
    },
    { keys: '=', actions: [ActionFilter.Format.bySelections] },
    { keys: ':', actions: [ActionCommandLine.promptAndRun] },
    {
      keys: 'z .',
      actions: [ActionReveal.primaryCursor],
      args: { revealType: TextEditorRevealType.InCenter },
    },
    {
      keys: 'z z',
      actions: [ActionReveal.primaryCursor],
      args: { revealType: TextEditorRevealType.InCenter },
    },
    {
      keys: 'z t',
      actions: [ActionReveal.primaryCursor],
      args: { revealType: TextEditorRevealType.AtTop },
    },
    {
      keys: 'z b',
      actions: [ActionReveal.primaryCursor],
      args: { revealType: TextEditorRevealType.Default },
    },
    { keys: 'z c', actions: [ActionFold.fold] },
    { keys: 'z o', actions: [ActionFold.unfold] },
    { keys: 'z M', actions: [ActionFold.foldAll] },
    { keys: 'z R', actions: [ActionFold.unfoldAll] },
    {
      keys: 'ctrl+c',
      actions: [ActionNativeEscape.press, ActionSelection.shrinkToActives],
    },
    {
      keys: 'ctrl+[',
      actions: [ActionNativeEscape.press, ActionSelection.shrinkToActives],
    },
    {
      keys: 'escape',
      actions: [ActionNativeEscape.press, ActionSelection.shrinkToActives],
    },
  ]

  constructor() {
    super()

    this.maps.forEach((map) => {
      this.mapper.map(map.keys, map.actions, map.args)
    })
  }

  enter(): void {
    super.enter()

    switch (this.id) {
      case ModeID.VISUAL:
        ActionSelection.expandToOne()
        break
      case ModeID.VISUAL_LINE:
        ActionSelection.expandToLine()
        break
    }

    if (Configuration.smartRelativeLineNumbers) {
      ActionRelativeLineNumbers.on()
    }
  }

  private _recordedCommandMaps: CommandMap[]

  get recordedCommandMaps(): CommandMap[] {
    return this._recordedCommandMaps
  }

  protected onWillCommandMapMakesChanges(map: CommandMap): Promise<boolean> {
    const actions = map.actions.filter((action) => {
      return StaticReflect.getMetadata(SymbolMetadata.Action.shouldSkipOnRepeat, action) !== true
    })

    const args = Object.assign(
      {
        preferredRelativeRange: window.activeTextEditor
          ? new RangeOffset(window.activeTextEditor.selection)
          : undefined,
      },
      map.args,
    )

    this._recordedCommandMaps = [
      {
        keys: map.keys,
        actions: actions,
        args: args,
        isRepeating: true,
      },
    ]

    return Promise.resolve(true)
  }
}
