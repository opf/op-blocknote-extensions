import { createExtension } from '@blocknote/core';
import { KeyboardDeleteExtension } from './keyboardDeleteExtension';
import { PasteDeduplicateExtension } from './pasteDeduplicateExtension';

/**
 * Required extensions for op-blocknote-extensions.
 *
 * Must be added to `editorOptions.extensions: [...]` at editor construction
 * time, not registered post-mount via `editor.registerPlugin(...)`.
 */
export const OpBlockNoteExtensions = createExtension({
  key: 'opBlockNoteExtensions',
  blockNoteExtensions: [PasteDeduplicateExtension, KeyboardDeleteExtension],
});
