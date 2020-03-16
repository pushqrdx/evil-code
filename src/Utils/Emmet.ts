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

function getHtmlRange(editor: TextEditor, rootNode: HtmlNode, position: Position): Range[] {
  const node = getNode(rootNode, position, true) as HtmlNode

  if (!node) {
    return []
  }

  const line = editor.document.lineAt(node.start)
  let openRange = new Range(node.open.start, node.open.end)

  if (line.range.isEqual(new Range(node.open.start, node.open.end))) {
    // this is a special case to mimic vim selecting everything including
    // line breaks
    openRange = openRange.with({
      end: node.open.start.translate(0, node.open.end.character + 2),
    })
  }

  let closeRange: Range | null = null

  if (node.close) {
    closeRange = new Range(node.close.start, node.close.end)
  } else {
    closeRange = openRange
  }

  const ranges = [openRange, closeRange]

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

  return getHtmlRange(editor, rootNode, anchor)
}
