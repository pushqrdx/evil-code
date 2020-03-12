export class UtilText {
  static switchCase(from: string): string {
    let to = ''

    const lowercase = from.toLocaleLowerCase()
    const uppercase = from.toLocaleUpperCase()

    for (let i = 0; i < from.length; i++) {
      if (from[i] !== lowercase[i]) {
        to += lowercase[i]
      } else {
        to += uppercase[i]
      }
    }

    return to
  }

  static rot13(text: string): string {
    return text.replace(/[a-z]/gi, (char) =>
      String.fromCharCode(char.charCodeAt(0) + (char.toUpperCase() > 'M' ? -13 : 13)),
    )
  }

  static countStringAppearance(searchString: string, text: string): number {
    let count = 0
    let position = -1

    // eslint-disable-next-line no-constant-condition
    while (true) {
      position = text.indexOf(searchString, position + 1)

      if (position < 0) break

      count++
    }

    return count
  }

  static getLineCount(text: string): number {
    return UtilText.countStringAppearance('\n', text) + 1
  }
}
