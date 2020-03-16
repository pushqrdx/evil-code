import { TextEditorRevealType } from 'vscode'

import { StaticReflect } from '../LanguageExtensions/StaticReflect'
import { SymbolMetadata } from '../Symbols/Metadata'
import { MatchResultKind } from '../Mappers/Generic'
import { CommandMap, CommandMapper } from '../Mappers/Command'
import { ActionPage } from '../Actions/Page'
import { ActionReveal } from '../Actions/Reveal'
import { ActionScroll } from '../Actions/Scroll'
import { ActionFold } from '../Actions/Fold'
import { ActionCommandLine } from '../Actions/CommandLine'

export enum ModeID {
  NORMAL,
  VISUAL,
  VISUAL_LINE,
  INSERT,
  REPLACE,
}

export abstract class Mode {
  id: ModeID
  name: string

  private pendings: CommandMap[] = []
  private executing = false
  private inputs: string[] = []

  protected mapper: CommandMapper = new CommandMapper()
  protected maps: CommandMap[] = [
    { keys: 'ctrl+b', actions: [ActionPage.up] },
    { keys: 'ctrl+f', actions: [ActionPage.down] },
    { keys: 'ctrl+y', actions: [ActionScroll.up] },
    { keys: 'ctrl+e', actions: [ActionScroll.down] },
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
    { keys: ':', actions: [ActionCommandLine.promptAndRun] },
  ]

  constructor() {
    this.maps.forEach((map) => {
      this.mapper.map(map.keys, map.actions, map.args)
    })
  }

  enter(): void {
    // ignore
  }

  exit(): void {
    this.clearInputs()
    this.clearPendings()
  }

  dispose(): void {
    this.exit()
  }

  private clearInputs(): void {
    this.inputs = []
  }

  private clearPendings(): void {
    this.pendings = []
  }

  input(key: string, _: {} = {}): MatchResultKind {
    let inputs: string[]

    if (key === 'escape') {
      inputs = [key]
    } else {
      this.inputs.push(key)
      inputs = this.inputs
    }

    const { kind, map } = this.mapper.match(inputs)

    if (kind === MatchResultKind.WAITING) {
      // this.updateStatusBar(`${this.inputs.join(' ')} | `)
      return kind
    }

    this.clearInputs()

    if (kind === MatchResultKind.FOUND) {
      this.pushCommandMap(map!)
      this.execute()
    }

    return kind
  }

  protected pushCommandMap(map: CommandMap): void {
    this.pendings.push(map)
  }

  /**
   * Override this to return recorded command maps.
   */
  get recordedCommandMaps(): CommandMap[] {
    return []
  }

  /**
   * Override this to do something before command map makes changes.
   */
  protected onWillCommandMapMakesChanges(_: CommandMap): Promise<boolean> {
    return Promise.resolve(true)
  }

  /**
   * Override this to do something after command map made changes.
   */
  protected onDidCommandMapMakesChanges(_: CommandMap): Promise<boolean> {
    return Promise.resolve(true)
  }

  /**
   * Override this to do something after selection changes.
   */
  onDidChangeTextEditorSelection(): void {
    // ignore
  }

  /**
   * Override this to do something after recording ends.
   */
  onDidRecordFinish(_: CommandMap[], __: ModeID): void {
    // ignore
  }

  protected execute(): void {
    if (this.executing) {
      return
    }

    this.executing = true

    const one = (): void => {
      const map = this.pendings.shift()

      if (!map) {
        this.executing = false
        return
      }

      let promise: Promise<boolean | undefined> = Promise.resolve(true)

      const isAnyActionIsChange = map.actions.some((action) => {
        return StaticReflect.getMetadata(SymbolMetadata.Action.isChange, action)
      })

      if (isAnyActionIsChange) {
        promise = promise.then(() => this.onWillCommandMapMakesChanges(map))
      }

      map.actions.forEach((action) => {
        promise = promise.then(() => action(map.args))
      })

      if (isAnyActionIsChange) {
        promise = promise.then(() => this.onDidCommandMapMakesChanges(map))
      }

      promise.then(one.bind(this), () => {
        this.clearPendings()
        this.executing = false
      })
    }

    one()
  }
}
