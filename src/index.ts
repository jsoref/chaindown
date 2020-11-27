import * as lo from 'lodash'
import { ArrayOrVarg, MaybeArray } from './utils'

const newLine = '\n'

type Chaindown = {
  heading(level: number, content: Node): Chaindown
  // heading(level: number, content: Node | ((chaindown: InnerChaindown) => void)): Chaindown
  list(items: Node[]): Chaindown
  codeSpan(content: Node): Chaindown
  render(state?: RenderState): string
}

// type InnerChaindown = {
//   heading(level: number, content: Node | ((chaindown: InnerChaindown) => void)): InnerChaindown
//   list(items: Node[]): InnerChaindown
//   codeSpan(content: Node): InnerChaindown
// }

type PrivateChaindown = Chaindown & { private: { state: ChaindownState } }

type ChaindownState = {
  nodes: Node[]
}

export function create(): Chaindown {
  const state: ChaindownState = {
    nodes: []
  }

  const api: Chaindown = {
    heading(level, content) {
      let contentResult
      // if (isFunction(content)) {
      //   const innerChaindown = create() as PrivateChaindown
      //   content(innerChaindown)
      //   contentResult = span(innerChaindown.private.state.nodes)
      // } else {
      contentResult = content
      // }
      state.nodes.push(heading(level, contentResult))
      return api
    },
    list(items) {
      state.nodes.push(list(items))
      return api
    },
    codeSpan(content) {
      state.nodes.push(codeSpan(content))
      return api
    },
    render(renderState?: RenderState) {
      const defaultState = {
        level: 0
      }
      const renderState_ = renderState ?? defaultState
      const result =
        state.nodes
          .map(n => render(renderState_, n))
          .join(newLine)
          .trim() + newLine
      return result
    }
  }

  const privateAPI = api as PrivateChaindown

  privateAPI.private = {
    state
  }

  return api
}

export function list(nodes: Node[]): Node {
  return {
    render(state) {
      return nodes.map(n => `- ${render(state, n)}`).join('\n')
    }
  }
}

/**
 * Create a markdown section. A section is a title following by content.
 */
export function section(title: Node): SmartNode {
  const data: { title: Node; nodes: Node[] } = {
    title,
    nodes: []
  }
  const me: SmartNode = {
    add(...sections) {
      data.nodes.push(...lo.flatten(sections))
      return me
    },
    render(state) {
      return render(
        state,
        lines(
          render(state, heading(state.level, data.title)),
          ...lo.flatMap(data.nodes, content => renderTree({ ...state, level: state.level + 1 }, content))
        )
      )
    }
  }
  return me
}

/**
 * Text inside a code block.
 */
export function codeBlock(languageType: string, content: Node): Renderable {
  return lines(join('```', languageType), content, '```')
}

/**
 * Text inside a TypeScript code block.
 */
export const tsCodeBlock = codeBlock.bind(null, 'ts')

/**
 * Text styled as code.
 */
export function codeSpan(n: Node): Renderable {
  return {
    render(state) {
      return join('`', render(state, n), '`')
    }
  }
}

/**
 * A markdown link.
 */
export function link(text: Node, url: string): Renderable {
  return {
    render(state) {
      return `[${render(state, text)}](${url})`
    }
  }
}

/**
 * A heading.
 */
export function heading(n: number, content: Node): Renderable {
  let i = 0
  let s = ''

  while (i < n) {
    s += '#'
    i++
  }

  return lines('', span(s, content), '')
}

/**
 * A newline separated series of nodes.
 */
export function lines(...nodes: ArrayOrVarg<Node>): SmartNode {
  const data = {
    nodes: lo.flatten(nodes)
  }

  const me: SmartNode = {
    add(...nodes) {
      data.nodes.push(...lo.flatten(nodes))
      return me
    },
    render(state) {
      return lo.flatMap(data.nodes, n => renderTree(state, n)).join('\n')
    }
  }

  return me
}

/**
 * A space separated series of nodes.
 */
export function span(...nodes: ArrayOrVarg<Node>): SmartNode {
  const data = {
    nodes: lo.flatten(nodes)
  }

  const me: SmartNode = {
    add(...nodes) {
      data.nodes.push(...lo.flatten(nodes))
      return me
    },
    render(state) {
      return lo.flatMap(data.nodes, n => renderTree(state, n)).join(' ')
    }
  }

  return me
}

/**
 * Prettier ignore pragma constant.
 */
export const PRETTIER_IGNORE = '<!-- prettier-ignore -->'

//
// Internal Utilities
//

export function render(state: RenderState, n: Node): string {
  return lo.flatten(renderTree(state, n)).join('')
}

function renderTree(state: RenderState, n: Node): MaybeArray<string> {
  return typeof n === 'string' ? n : n.render(state)
}

interface RenderState {
  level: number
}

interface Renderable {
  render(state: RenderState): MaybeArray<string>
}

interface Appendable {
  add(...nodes: ArrayOrVarg<Node>): Node
}

export interface SmartNode extends Renderable, Appendable {}

export type Node = Renderable | string

function join(...strings: string[]): string {
  return strings.join('')
}
