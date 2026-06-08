import type { BlockNoteEditor } from '@blocknote/core';
import { useInlineWpEvents } from './useInlineWpEvents';

export function useOpBlockNoteExtensions(
  editor: BlockNoteEditor<any, any, any>
): void {
  useInlineWpEvents(editor);
}