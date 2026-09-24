import type {Plugin} from 'unified';
import {EXTENSION_VERSION} from '../extension-version';

// 文档里写这个占位符，构建时会被替换成 EXTENSION_VERSION。
// 请写在围栏代码块或行内代码里（那里的大括号是原文，MDX 不会当成表达式）。
//
// Write this placeholder in the docs and it is replaced by EXTENSION_VERSION at build time. Keep it
// inside a fenced code block or inline code, where the braces are literal text rather than an MDX
// expression.
export const VERSION_PLACEHOLDER = '{{EXTENSION_VERSION}}';

// 只处理「纯文本载体」节点：
//   text       普通正文
//   inlineCode `行内代码`
//   code       ```围栏代码块
// MDX 的表达式节点（mdxTextExpression / mdxFlowExpression，也就是 `{expr}`）与
// ESM 节点不在其中，因此这里不会干扰 MDX 自身的求值行为。
//
// Only "plain text carriers" are touched — `text`, `inlineCode` and `code`. MDX expression nodes
// (`{expr}`) and ESM nodes are not, so this never interferes with MDX's own evaluation.
const TEXT_NODE_TYPES = new Set(['text', 'inlineCode', 'code']);

interface TextLikeNode {
  type: string;
  value?: unknown;
  children?: TextLikeNode[];
}

/**
 * 把占位符替换成真实版本号。
 *
 * 这是构建期的一次性文本替换：只替换精确的 `{{EXTENSION_VERSION}}`，
 * 不做任何通用的 `{{…}}` 解析，所以对其它内容零影响。
 *
 * A one-shot build-time text replacement: only the exact `{{EXTENSION_VERSION}}` is substituted and
 * no generic `{{…}}` parsing happens, so nothing else is affected.
 */
const remarkVersionPlaceholder: Plugin = () => (tree) => {
    const walk = (node: unknown): void => {
        if (typeof node !== 'object' || node === null) {
            return;
        }

        const candidate = node as TextLikeNode;
        const value = candidate.value;

        if (
            typeof candidate.type === 'string' &&
            typeof value === 'string' &&
            TEXT_NODE_TYPES.has(candidate.type) &&
            value.includes(VERSION_PLACEHOLDER)
        ) {
            candidate.value = value.split(VERSION_PLACEHOLDER).join(EXTENSION_VERSION);
        }

        if (Array.isArray(candidate.children)) {
            candidate.children.forEach(walk);
        }
    };

    walk(tree);
};

export default remarkVersionPlaceholder;
