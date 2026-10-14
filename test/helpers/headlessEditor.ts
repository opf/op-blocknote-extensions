import { BlockNoteEditor, BlockNoteSchema } from '@blocknote/core';
import { withCollaboration } from '@blocknote/core/yjs';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { onTestFinished } from 'vitest';
import * as Y from 'yjs';
import {
  openProjectWorkPackageBlockSpec,
  openProjectWorkPackageInlineSpec,
  openProjectUserMentionSpec,
  UserMentionAuthorExtension,
} from '../../lib';
import type { AnyEditor } from '../../lib/editorTypes';
import { INLINE_WP_TYPE, USER_MENTION_TYPE } from '../../lib/utils/nodeTypes';

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    openProjectWorkPackageBlock: openProjectWorkPackageBlockSpec(),
  },
  inlineContentSpecs: {
    openProjectWorkPackageInline: openProjectWorkPackageInlineSpec,
    openProjectUserMention: openProjectUserMentionSpec,
  },
});

export interface InlineNode {
  type:string;
  text?:string;
  props?:Record<string, unknown>;
}

const extensions = [UserMentionAuthorExtension];

export function createHeadlessEditorWithBlocks(blocks:unknown[]) {
  return BlockNoteEditor.create({ schema, extensions, initialContent: blocks as never });
}

// ProseMirror plugins only run once the editor is mounted.
export function mountHeadlessEditor<Editor extends AnyEditor>(editor:Editor):Editor {
  editor.mount(document.createElement('div'));
  onTestFinished(() => editor.unmount());
  return editor;
}

// Two editors on separate Y.Docs that only exchange changes when `sync` is called,
// so a test controls what the editor is doing while a collaborator's change arrives.
export function createCollaborativeHeadlessEditors() {
  const documents = [new Y.Doc(), new Y.Doc()];
  const editors = documents.map((document) => {
    const editor = BlockNoteEditor.create(withCollaboration({
      schema,
      extensions,
      collaboration: { fragment: document.getXmlFragment('document-store'), user: { name: 'Collaborator', color: '#000000' } },
    }));
    return mountHeadlessEditor(editor);
  });

  const sync = () => {
    Y.applyUpdate(documents[1], Y.encodeStateAsUpdate(documents[0]));
    Y.applyUpdate(documents[0], Y.encodeStateAsUpdate(documents[1]));
  };

  return { editors, sync };
}

export function createHeadlessEditor(content:unknown[] | string) {
  return createHeadlessEditorWithBlocks([{ type: 'paragraph', content }]);
}

export function createHeadlessEditorWithText(text:string) {
  const editor = createHeadlessEditor(text);
  editor.setTextCursorPosition(editor.document[0], 'end');
  return editor;
}

export function blockContent(editor:AnyEditor, blockIndex = 0):InlineNode[] {
  return (editor.document[blockIndex]?.content ?? []) as InlineNode[];
}

export function blockTypes(editor:AnyEditor):string[] {
  return editor.document.map((block) => block.type as string);
}

export function blockText(editor:AnyEditor, blockIndex = 0):string {
  return blockContent(editor, blockIndex).map((node) => node.text ?? '').join('');
}

export function blockTextWithNodes(editor:AnyEditor, blockIndex = 0):string {
  return blockContent(editor, blockIndex)
    .map((node) => (node.type === 'text' ? node.text : `[${node.type}]`))
    .join('');
}

export function mentionsIn(editor:AnyEditor):InlineNode['props'][] {
  return editor.document
    .flatMap((block) => (Array.isArray(block.content) ? block.content as InlineNode[] : []))
    .filter((node) => node.type === USER_MENTION_TYPE)
    .map((node) => node.props);
}

export function selectedNodeType(editor:AnyEditor):string | undefined {
  const { selection } = editor.prosemirrorState;
  return selection instanceof NodeSelection ? selection.node.type.name : undefined;
}

export function nthChipPosition(editor:AnyEditor, ordinal = 0):number {
  return nthInlineNodePosition(editor, INLINE_WP_TYPE, ordinal);
}

export function nthInlineNodePosition(editor:AnyEditor, nodeType:string, ordinal = 0):number {
  let seen = -1;
  let found = -1;
  editor.prosemirrorState.doc.descendants((node, position) => {
    if (found !== -1) return false;
    if (node.type.name === nodeType) {
      seen += 1;
      if (seen === ordinal) {
        found = position;
        return false;
      }
    }
    return true;
  });
  return found;
}

export function placeCursorAfterText(editor:AnyEditor, marker:string):void {
  let target = -1;
  editor.prosemirrorState.doc.descendants((node, position) => {
    if (target !== -1) return false;
    if (node.isText && node.text?.includes(marker)) {
      target = position + node.text.indexOf(marker) + marker.length;
      return false;
    }
    return true;
  });
  if (target === -1) throw new Error(`"${marker}" is not in the document`);

  editor.transact((tr) => {
    tr.setSelection(TextSelection.create(tr.doc, target));
  });
}
