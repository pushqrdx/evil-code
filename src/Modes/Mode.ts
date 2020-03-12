import { StaticReflect } from '../LanguageExtensions/StaticReflect'
import { SymbolMetadata } from '../Symbols/Metadata'
import { MatchResultKind } from '../Mappers/Generic'
import { CommandMap, CommandMapper } from '../Mappers/Command'

export enum ModeID {
  NORMAL,
  VISUAL,
  VISUAL_LINE,
  INSERT,
}

export abstract class Mode {
  id: ModeID
  name: string

  private pendings: CommandMap[] = []
  private executing = false
  private inputs: string[] = []

  protected mapper: CommandMapper = new CommandMapper()

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
