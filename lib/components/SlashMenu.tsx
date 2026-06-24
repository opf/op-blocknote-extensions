import type { BlockNoteEditor, InlineContentFromConfig } from '@blocknote/core';
import { LinkIcon } from '@primer/octicons-react';
import i18n from '../services/i18n.ts';
import { getAliases } from '../services/slashMenuAliases';
import { registerInlineWpCallbacks, clearInlineWpCallbacks, makePendingWpid } from './InlineWorkPackage/callbacks';
import { makeInstanceId } from '../utils/id.ts';
import {
  placeCursorAfterInlineNode,
} from '../utils/cursor.ts';
import { pendingBlockRegistry } from './BlockWorkPackage/pendingBlockRegistry';
import { isCurrentBlockEmpty } from '../utils/blockContent.ts';
import type { AnyEditor } from './HashMenu/editorUtils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInlineNode = InlineContentFromConfig<any, any>;
interface TextNode { type:'text'; text:string; styles:Record<string, unknown> }

function getBlockContent(
  editor:AnyEditor,
  blockId:string
):{ blockId:string; content:AnyInlineNode[] } | null {
  const block = editor.getBlock(blockId) as { id:string; content:AnyInlineNode[] } | null;
  if (!block) return null;
  return { blockId: block.id, content: block.content ?? [] };
}

function buildOnSelect(
  editor:AnyEditor,
  blockId:string,
  pendingWpid:string,
  instanceId:string
):(wpid:number, displayId:string) => void {
  return (wpid:number, displayId:string) => {
    const current = getBlockContent(editor, blockId);
    if (!current) return;

    const chipIndex = current.content.findIndex((node) => {
      const n = node as { type:string; props?:{ wpid?:string } };
      return n.type === 'openProjectWorkPackageInline' && n.props?.wpid === pendingWpid;
    });

    const updatedContent = current.content.map((node) => {
      const n = node as { type:string; props?:{ wpid?:string; instanceId?:string } };
      if (n.type === 'openProjectWorkPackageInline' && n.props?.wpid === pendingWpid) {
        return { ...n, props: { ...n.props, wpid: String(wpid), instanceId, displayId } };
      }
      return node;
    });

    const nodeAfter = updatedContent[chipIndex + 1] as TextNode | undefined;
    const hasSpaceAfter = nodeAfter?.type === 'text' && nodeAfter?.text?.startsWith(' ');
    if (!hasSpaceAfter) {
      updatedContent.splice(chipIndex + 1, 0, { type: 'text', text: ' ', styles: {} } as AnyInlineNode);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    editor.updateBlock(current.blockId, { content: updatedContent } as any);

    requestAnimationFrame(() => {
      editor.focus();
      placeCursorAfterInlineNode(editor, instanceId);

      // Mitigate bug where backspace would not work on text typed directly after adding
      // a new inline work package link.
      // Tiptap's built-in Backspace handler only covers special cases - undoing input
      // rules, deleting a non-empty selection, joining blocks at the start of a line.
      // For a normal cursor sitting in the middle of text, every registered handler
      // returns false. ProseMirror then falls back to letting the browser handle the
      // keystroke natively.
      //
      // The native path:
      //
      //     Browser modifies the DOM
      //     ProseMirror's domObserver detects the change and creates a transaction
      //     Transaction is sent to Yjs via ySyncPlugin
      //
      // Step 2 becomes unreliable when a WP chip is present. The chip is an atom node
      // rendered with contenteditable="false". Combined with y-prosemirror's own DOM
      // instrumentation, the domObserver either misses the change or produces an empty
      // no-op transaction. ProseMirror and Yjs states diverge - Backspace does nothing.
      //
      // A re-sync event (timeout, click, or next edit) restores normal behavior.
      // We're setting the cursor position to trigger this re-sync event.
      editor.setTextCursorPosition(current.blockId, 'end');
    });
  };
}

function buildOnCancel(
  editor:AnyEditor,
  blockId:string,
  pendingWpid:string,
  instanceId:string
):() => void {
  return () => {
    const current = getBlockContent(editor, blockId);
    if (!current) return;

    const updatedContent = current.content.filter((node) => {
      const n = node as { type:string; props?:{ wpid?:string } };
      return !(n.type === 'openProjectWorkPackageInline' && n.props?.wpid === pendingWpid);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    editor.updateBlock(current.blockId, { content: updatedContent } as any);
    clearInlineWpCallbacks(instanceId);
  };
}

function insertBlockWorkPackage(editor:AnyEditor):void {
  const blockId = editor.getTextCursorPosition()?.block?.id as string | undefined;
  if (!blockId) return;

  const block = {
    type: 'openProjectWorkPackageBlock' as const,
    props: {},
  } as Parameters<typeof editor.insertBlocks>[0][number];

  const [insertedBlock] = editor.insertBlocks([block], blockId, 'after');
  if (!insertedBlock?.id) return;

  pendingBlockRegistry.add(insertedBlock.id);
  editor.removeBlocks([blockId]);
}

function insertInlineWorkPackage(editor:AnyEditor):void {
  const instanceId = makeInstanceId();
  const pendingWpid = makePendingWpid(instanceId);

  const blockId = editor.getTextCursorPosition()?.block?.id as string | undefined;
  if (!blockId) return;

  const onSelect = buildOnSelect(editor, blockId, pendingWpid, instanceId);
  const onCancel = buildOnCancel(editor, blockId, pendingWpid, instanceId);

  registerInlineWpCallbacks(instanceId, onSelect, onCancel);

  try {
    (editor.insertInlineContent as (content:unknown[]) => void)([
      { type: 'openProjectWorkPackageInline', props: { wpid: pendingWpid, instanceId, size: 's' } },
      ' ',
    ]);
  } catch (error) {
    console.error('[inline-wp] insertInlineContent failed:', error);
    clearInlineWpCallbacks(instanceId);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const workPackageSlashMenu = (editor:BlockNoteEditor<any>) => ({
  title: i18n.t('slashMenu.title'),
  onItemClick: () => {
    if (isCurrentBlockEmpty(editor)) {
      insertBlockWorkPackage(editor);
    } else {
      insertInlineWorkPackage(editor);
    }
  },
  aliases: [...getAliases()],
  group: 'OpenProject',
  icon: <LinkIcon size={18} />,
  subtext: i18n.t('slashMenu.subtext'),
});