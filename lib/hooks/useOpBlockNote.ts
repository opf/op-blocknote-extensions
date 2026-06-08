import { useCreateBlockNote } from '@blocknote/react';
import { DeduplicateInstanceIdsExtension } from '../plugins/pasteDeduplicatePlugin';
import { useInlineWpEvents } from './useInlineWpEvents';

export function useOpBlockNote(
  params: Parameters<typeof useCreateBlockNote>[0] = {},
  deps: Parameters<typeof useCreateBlockNote>[1] = [],
) {
  const editor = useCreateBlockNote(
    {
      ...params,
      extensions: [
        DeduplicateInstanceIdsExtension,
        ...(params.extensions ?? []),
      ],
    },
    deps,
  );

  useInlineWpEvents(editor);

  return editor;
}