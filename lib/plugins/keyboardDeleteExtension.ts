import { createExtension } from '@blocknote/core';
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';

const pluginKey = new PluginKey('opKeyboardDelete');

// Intl.Segmenter is ES2022; cast to avoid bumping tsconfig lib target.
interface SegmenterEntry {segment:string}
type SegmenterCtor = new (locale?:string, opts?:{granularity?:string}) => {segment(text:string):Iterable<SegmenterEntry>};
const SegmenterCls = (Intl as {Segmenter?:SegmenterCtor}).Segmenter;
const segmenter = SegmenterCls ? new SegmenterCls(undefined, { granularity: 'grapheme' }) : null;

function graphemes(text:string):string[] {
  if (segmenter) {
    return [...segmenter.segment(text)].map(e => e.segment);
  }
  return [...text];
}

function backwardCharSize(node:{isText:boolean; text?:string|null; nodeSize:number}):number {
  if (!node.isText) return node.nodeSize;
  const g = graphemes(node.text!);
  return g[g.length - 1]?.length ?? 1;
}

function forwardCharSize(node:{isText:boolean; text?:string|null; nodeSize:number}):number {
  if (!node.isText) return node.nodeSize;
  return graphemes(node.text!)[0]?.length ?? 1;
}

const keyboardDeletePlugin = new Plugin({
  key: pluginKey,
  props: {
    handleKeyDown(view, event) {
      const isBackspace = event.key === 'Backspace';
      const isDelete = event.key === 'Delete';
      if ((!isBackspace && !isDelete) || event.isComposing) return false;

      const { selection } = view.state;
      if (!(selection instanceof TextSelection) || !selection.empty) return false;

      const $cursor = selection.$cursor;
      if (!$cursor) return false;

      const isLineDelete = event.metaKey && !event.ctrlKey && !event.altKey;
      const isWordDelete = event.ctrlKey || event.altKey;

      if (isBackspace) {
        if ($cursor.parentOffset === 0) return false;
        const nodeBefore = $cursor.nodeBefore;
        if (!nodeBefore) return false;

        let from:number;
        if (isLineDelete) {
          from = $cursor.pos - $cursor.parentOffset;
        } else if (isWordDelete && nodeBefore.isText) {
          const text = nodeBefore.text!;
          let i = text.length;
          while (i > 0 && /\s/.test(text[i - 1])) i -= 1;
          while (i > 0 && !/\s/.test(text[i - 1])) i -= 1;
          from = $cursor.pos - (text.length - i);
        } else {
          from = $cursor.pos - backwardCharSize(nodeBefore);
        }

        view.dispatch(view.state.tr.delete(from, $cursor.pos));
        return true;
      }

      const nodeAfter = $cursor.nodeAfter;
      if (!nodeAfter) return false;

      let to:number;
      if (isLineDelete) {
        to = $cursor.end();
      } else if (isWordDelete && nodeAfter.isText) {
        const text = nodeAfter.text!;
        let i = 0;
        while (i < text.length && !/\s/.test(text[i])) i += 1;
        while (i < text.length && /\s/.test(text[i])) i += 1;
        to = $cursor.pos + i;
      } else {
        to = $cursor.pos + forwardCharSize(nodeAfter);
      }

      view.dispatch(view.state.tr.delete($cursor.pos, to));
      return true;
    },
  },
});

export const KeyboardDeleteExtension = createExtension({
  key: 'opKeyboardDelete',
  prosemirrorPlugins: [keyboardDeletePlugin],
});
