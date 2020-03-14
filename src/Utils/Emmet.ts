import { HtmlNode, Node } from 'EmmetNode'
import parse from '@emmetio/html-matcher'
import parseStylesheet from '@emmetio/css-parser'
import { isStyleSheet } from 'vscode-emmet-helper'
import { Range, TextEditor, TextDocument, Position, window } from 'vscode'

import { DocumentStreamReader } from './StreamReader'

export const allowedMimeTypesInScriptTag = [
  'text/html',
  'text/plain',
  'text/x-template',
  'text/template',
  'text/ng-template',
]

export function parseDocument(document: TextDocument): Node | undefined {
  const parseContent = isStyleSheet(document.languageId) ? parseStylesheet : parse

  try {
    return parseContent(new DocumentStreamReader(document))
  } catch (e) {
    // ignore
  }

  return undefined
}

export function getNode(
  root: Node | undefined,
  position: Position,
  includeNodeBoundary: boolean,
): Node | null {
  if (!root) {
    return null
  }

  let currentNode = root.firstChild
  let foundNode: Node | null = null

  while (currentNode) {
    const nodeStart: Position = currentNode.start
    const nodeEnd: Position = currentNode.end

    if (
      (nodeStart.isBefore(position) && nodeEnd.isAfter(position)) ||
      (includeNodeBoundary &&
        nodeStart.isBeforeOrEqual(position) &&
        nodeEnd.isAfterOrEqual(position))
    ) {
      foundNode = currentNode
      // Dig deeper
      currentNode = currentNode.firstChild
    } else {
      currentNode = currentNode.nextSibling
    }
  }

  return foundNode
}

export function getHtmlNode(
  document: TextDocument,
  root: Node | undefined,
  position: Position,
  includeNodeBoundary: boolean,
): HtmlNode | undefined {
  let currentNode = getNode(root, position, includeNodeBoundary) as HtmlNode

  if (!currentNode) {
    return
  }

  const isTemplateScript =
    currentNode.name === 'script' &&
    currentNode.attributes &&
    currentNode.attributes.some(
      (x) =>
        x.name.toString() === 'type' &&
        allowedMimeTypesInScriptTag.indexOf(x.value.toString()) > -1,
    )

  if (
    isTemplateScript &&
    currentNode.close &&
    position.isAfter(currentNode.open.end) &&
    position.isBefore(currentNode.close.start)
  ) {
    const buffer = new DocumentStreamReader(
      document,
      currentNode.open.end,
      new Range(currentNode.open.end, currentNode.close.start),
    )

    try {
      const scriptInnerNodes = parse(buffer)

      currentNode =
        (getNode(scriptInnerNodes, position, includeNodeBoundary) as HtmlNode) || currentNode
    } catch (e) {
      // ignore
    }
  }

  return currentNode
}

function getHtmlRange(
  editor: TextEditor,
  rootNode: HtmlNode,
  position: Position,
  indentInSpaces: string,
): Range[] {
  const nodeToUpdate = getHtmlNode(editor.document, rootNode, position, true)

  if (!nodeToUpdate) {
    return []
  }

  const openRange = new Range(nodeToUpdate.open.start, nodeToUpdate.open.end)
  let closeRange: Range | null = null

  if (nodeToUpdate.close) {
    closeRange = new Range(nodeToUpdate.close.start, nodeToUpdate.close.end)
  }

  const ranges = [openRange]

  if (closeRange) {
    for (let i = openRange.start.line + 1; i <= closeRange.start.line; i++) {
      const lineContent = editor.document.lineAt(i).text

      if (lineContent.startsWith('\t')) {
        ranges.push(new Range(i, 0, i, 1))
      } else if (lineContent.startsWith(indentInSpaces)) {
        ranges.push(new Range(i, 0, i, indentInSpaces.length))
      }
    }

    ranges.push(closeRange)
  }

  return ranges
}

export function selectTag(anchor: Position): Range[] {
  if (!window.activeTextEditor) {
    return []
  }

  const editor = window.activeTextEditor
  const rootNode = parseDocument(editor.document) as HtmlNode

  if (!rootNode) {
    return []
  }

  let indentInSpaces = ''
  const tabSize: number = editor.options.tabSize ? +editor.options.tabSize : 0

  for (let i = 0; i < tabSize || 0; i++) {
    indentInSpaces += ' '
  }

  return getHtmlRange(editor, rootNode, anchor, indentInSpaces)
}
