import { window, commands } from 'vscode'

import { StaticReflect } from '../LanguageExtensions/StaticReflect'
import { SymbolMetadata } from '../Symbols/Metadata'
import { ModeID } from '../Modes/Mode'
import { ActionSelection } from '../Actions/Selection'

export class ActionMode {
  @StaticReflect.metadata(SymbolMetadata.Action.shouldSkipOnRepeat, true)
  static toNormal(): Thenable<boolean> {
    return commands
      .executeCommand(`evil.mode.${ModeID.NORMAL}`)
      .then(() => ActionSelection.validateSelections())
  }

  @StaticReflect.metadata(SymbolMetadata.Action.shouldSkipOnRepeat, true)
  static toVisual(): Thenable<boolean | undefined> {
    return commands.executeCommand(`evil.mode.${ModeID.VISUAL}`)
  }

  @StaticReflect.metadata(SymbolMetadata.Action.shouldSkipOnRepeat, true)
  static toVisualLine(): Thenable<boolean | undefined> {
    return commands.executeCommand(`evil.mode.${ModeID.VISUAL_LINE}`)
  }

  @StaticReflect.metadata(SymbolMetadata.Action.isChange, true)
  @StaticReflect.metadata(SymbolMetadata.Action.shouldSkipOnRepeat, true)
  static toInsert(): Thenable<boolean | undefined> {
    return commands.executeCommand(`evil.mode.${ModeID.INSERT}`)
  }

  @StaticReflect.metadata(SymbolMetadata.Action.isChange, true)
  @StaticReflect.metadata(SymbolMetadata.Action.shouldSkipOnRepeat, true)
  static toReplace(): Thenable<boolean | undefined> {
    return commands.executeCommand(`evil.mode.${ModeID.REPLACE}`)
  }

  static switchByActiveSelections(currentMode: ModeID | null): Thenable<boolean> {
    const activeTextEditor = window.activeTextEditor

    if (!activeTextEditor) {
      return Promise.resolve(false)
    }

    if (currentMode === ModeID.INSERT || currentMode === ModeID.REPLACE) {
      return Promise.resolve(true)
    }

    const selections = activeTextEditor.selections

    let mode: ModeID

    if (selections.every((selection) => selection.isEmpty)) {
      mode = ModeID.NORMAL
    } else {
      mode = ModeID.VISUAL
    }

    if (mode === currentMode) {
      return Promise.resolve(true)
    } else if (mode === ModeID.VISUAL && currentMode === ModeID.VISUAL_LINE) {
      return Promise.resolve(true)
    } else {
      return commands.executeCommand(`evil.mode.${mode}`).then(() => true)
    }
  }
}
