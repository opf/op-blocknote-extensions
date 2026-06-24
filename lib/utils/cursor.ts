import type { BlockNoteEditor } from '@blocknote/core';
import { TextSelection } from 'prosemirror-state';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = BlockNoteEditor<any, any, any>;

export function moveCursorAfterBlock(editor:AnyEditor, blockId:string):void {
  editor.focus();
  editor.setTextCursorPosition(blockId, 'end');

  const cursor = editor.getTextCursorPosition();
  if (!cursor?.nextBlock && cursor?.block) {
    editor.insertBlocks([{ type: 'paragraph', content: [] }], cursor.block.id, 'after');
  }

  const updated = editor.getTextCursorPosition();
  if (updated?.nextBlock) {
    editor.setTextCursorPosition(updated.nextBlock.id, 'start');
  }
}

/**
 * Reports whether the inline node identified by `instanceId` is the last meaningful content
 * of `blockId` — i.e. nothing follows it, or only a single trailing space text node does.
 * Uses the BlockNote API only. When true, the cursor can be placed after the node via the
 * block-level `setTextCursorPosition(blockId, 'end')`, which BlockNote does support; mid-block
 * positions have no BlockNote API and need `placeCursorAfterInlineNode`.
 */
export function isInlineNodeAtBlockEnd(
  editor:AnyEditor,
  blockId:string,
  instanceId:string,
):boolean {
  const block = editor.getBlock(blockId);
  if (!block) return false;

  const content = (block.content ?? []) as {
    type:string;
    text?:string;
    props?:{ instanceId?:string };
  }[];

  const index = content.findIndex(
    (node) =>
      node.type === 'openProjectWorkPackageInline' &&
      node.props?.instanceId === instanceId,
  );
  if (index === -1) return false;

  const after = content.slice(index + 1);
  if (after.length === 0) return true;
  return (
    after.length === 1 && after[0].type === 'text' && after[0].text === ' '
  );
}

export function placeCursorAfterInlineNode(
  editor:AnyEditor,
  instanceId:string,
):void {
  const { doc } = editor.prosemirrorState;
  let targetPos:number | null = null;

  doc.descendants((node, pos) => {
    if (targetPos !== null) return false;
    if ((node.attrs as Record<string, unknown>)?.instanceId === instanceId) {
      targetPos = pos + node.nodeSize;
      return false;
    }
    return true;
  });

  if (targetPos !== null) {
    const pos = targetPos;
    editor.transact((tr) => {
      tr.setSelection(TextSelection.create(tr.doc, pos));
    });
  }
}
