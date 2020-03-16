import { CommandMap } from '../Mappers/Command'
import { ActionMoveCursor } from '../Actions/MoveCursor'
import { ActionPage, PageMoveType } from '../Actions/Page'
import { ActionSelection } from '../Actions/Selection'
import { ActionRegister } from '../Actions/Register'
import { ActionDelete } from '../Actions/Delete'
import { ActionReplace } from '../Actions/Replace'
import { ActionJoinLines } from '../Actions/JoinLines'
import { ActionFind } from '../Actions/Find'
import { ActionMode } from '../Actions/Mode'
import { ActionIndent } from '../Actions/Indent'
import { MotionLine } from '../Motions/Line'

import { ModeID } from './Mode'
import { ModeVisualBase } from './VisualBase'

export class ModeVisual extends ModeVisualBase {
  id = ModeID.VISUAL
  name = 'VISUAL'

  protected maps: CommandMap[] = [
    { keys: '{textObject}', actions: [ActionSelection.expandByTextObject] },
    {
      keys: '{motion}',
      actions: [ActionMoveCursor.byMotions],
      args: { isVisualMode: true },
    },
    {
      keys: '{N} {motion}',
      actions: [ActionMoveCursor.byMotions],
      args: { isVisualMode: true },
    },
    {
      keys: 'ctrl+b',
      actions: [ActionPage.up],
      args: { moveType: PageMoveType.Select },
    },
    {
      keys: 'ctrl+f',
      actions: [ActionPage.down],
      args: { moveType: PageMoveType.Select },
    },
    {
      keys: 'backspace',
      actions: [ActionDelete.selectionsOrRight],
      args: { shouldYank: true },
    },
    {
      keys: 'delete',
      actions: [ActionDelete.selectionsOrRight],
      args: { shouldYank: true },
    },
    {
      keys: 'x',
      actions: [ActionDelete.selectionsOrRight],
      args: { shouldYank: true },
    },
    {
      keys: 'd',
      actions: [ActionDelete.selectionsOrRight],
      args: { shouldYank: true },
    },
    {
      keys: 'c',
      actions: [ActionDelete.selectionsOrRight, ActionMode.toInsert],
      args: { shouldYank: true },
    },
    {
      keys: 's',
      actions: [ActionDelete.selectionsOrRight, ActionMode.toInsert],
      args: { shouldYank: true },
    },
    {
      keys: 'y',
      actions: [ActionRegister.yankSelections, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'Y',
      actions: [
        ActionRegister.yankLines,
        ActionSelection.shrinkToStarts,
        () =>
          ActionMoveCursor.byMotions({
            motions: [MotionLine.start()],
          }),
      ],
    },
    {
      keys: 'J',
      actions: [ActionJoinLines.onSelections, ActionSelection.shrinkToActives],
    },
    {
      keys: 'p',
      actions: [ActionReplace.selectionsWithRegister],
      args: { shouldYank: true },
    },
    {
      keys: 'P',
      actions: [ActionReplace.selectionsWithRegister],
      args: { shouldYank: true },
    },
    {
      keys: '<',
      actions: [ActionIndent.decrease],
      args: { isVisualMode: true },
    },
    {
      keys: '>',
      actions: [ActionIndent.increase],
      args: { isVisualMode: true },
    },
    { keys: '/', actions: [ActionFind.focusFindWidget] },
    { keys: 'V', actions: [ActionMode.toVisualLine] },
    { keys: 'v', actions: [ActionSelection.shrinkToActives] },
  ]

  constructor() {
    super()

    this.maps.forEach((map) => {
      this.mapper.map(map.keys, map.actions, map.args)
    })
  }
}
