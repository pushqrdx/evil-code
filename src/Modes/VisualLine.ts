import { CommandMap } from '../Mappers/Command'
import { ActionMoveCursor } from '../Actions/MoveCursor'
import { ActionPage, PageMoveType } from '../Actions/Page'
import { ActionSelection } from '../Actions/Selection'
import { ActionRegister } from '../Actions/Register'
import { ActionDelete } from '../Actions/Delete'
import { ActionInsert } from '../Actions/Insert'
import { ActionReplace } from '../Actions/Replace'
import { ActionJoinLines } from '../Actions/JoinLines'
import { ActionFind } from '../Actions/Find'
import { ActionMode } from '../Actions/Mode'
import { ActionIndent } from '../Actions/Indent'

import { ModeID } from './Mode'
import { ModeVisualBase } from './VisualBase'

export class ModeVisualLine extends ModeVisualBase {
  id = ModeID.VISUAL_LINE
  name = 'VISUAL LINE'

  protected maps: CommandMap[] = [
    {
      keys: '{motion}',
      actions: [ActionMoveCursor.byMotions],
      args: { isVisualLineMode: true },
    },
    {
      keys: '{N} {motion}',
      actions: [ActionMoveCursor.byMotions],
      args: { isVisualLineMode: true },
    },
    {
      keys: 'ctrl+b',
      actions: [ActionPage.up],
      args: { moveType: PageMoveType.SelectLine },
    },
    {
      keys: 'ctrl+f',
      actions: [ActionPage.down],
      args: { moveType: PageMoveType.SelectLine },
    },
    {
      keys: 'backspace',
      actions: [ActionDelete.byLines],
      args: { shouldYank: true },
    },
    {
      keys: 'delete',
      actions: [ActionDelete.byLines],
      args: { shouldYank: true },
    },
    {
      keys: 'x',
      actions: [ActionDelete.byLines],
      args: { shouldYank: true },
    },
    {
      keys: 'd',
      actions: [ActionDelete.byLines],
      args: { shouldYank: true },
    },
    {
      keys: 'c',
      actions: [ActionDelete.byLines, ActionInsert.newLineBefore, ActionMode.toInsert],
      args: { shouldYank: true },
    },
    {
      keys: 's',
      actions: [ActionDelete.byLines, ActionInsert.newLineBefore, ActionMode.toInsert],
      args: { shouldYank: true },
    },
    {
      keys: 'y',
      actions: [ActionRegister.yankLines, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'Y',
      actions: [ActionRegister.yankLines, ActionSelection.shrinkToStarts],
    },
    {
      keys: 'J',
      actions: [ActionJoinLines.onSelections, ActionSelection.shrinkToActives],
    },

    {
      keys: 'p',
      actions: [ActionReplace.selectionsWithRegister],
      args: {
        shouldYank: true,
        isLinewise: true,
      },
    },
    {
      keys: 'P',
      actions: [ActionReplace.selectionsWithRegister],
      args: {
        shouldYank: true,
        isLinewise: true,
      },
    },
    {
      keys: '<',
      actions: [ActionIndent.decrease],
      args: { isVisualLineMode: true },
    },
    {
      keys: '>',
      actions: [ActionIndent.increase],
      args: { isVisualLineMode: true },
    },
    { keys: '/', actions: [ActionFind.focusFindWidget] },
    { keys: 'v', actions: [ActionMode.toVisual] },
    { keys: 'V', actions: [ActionSelection.shrinkToActives] },
  ]

  constructor() {
    super()

    this.maps.forEach((map) => {
      this.mapper.map(map.keys, map.actions, map.args)
    })
  }
}
