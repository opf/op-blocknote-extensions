// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { Transaction } from 'prosemirror-state';
import type { Schema } from 'prosemirror-model';
import { ySyncPluginKey } from 'y-prosemirror';
import { initEditorContext } from '../../../lib/services/editorContext';
import { userMentionAuthorPlugin } from '../../../lib/plugins/userMentionAuthorPlugin';
import { USER_MENTION_TYPE } from '../../../lib/utils/nodeTypes';
import type { AnyEditor } from '../../../lib/editorTypes';
import {
  blockText,
  blockTextWithNodes,
  createCollaborativeHeadlessEditors,
  createHeadlessEditor,
  createHeadlessEditorWithBlocks,
  createHeadlessEditorWithText,
  mentionsIn,
  mountHeadlessEditor,
  nthInlineNodePosition,
  placeCursorAfterText,
} from '../../helpers/headlessEditor';
import { mentionContent, paragraphWith, textContent } from '../../helpers/content';

function judithNode(schema:Schema, mentionedBy:string) {
  return schema.nodes[USER_MENTION_TYPE].create({ userId: '5', name: 'Judith Roth', mentionedBy });
}

function insertMentionNode(editor:AnyEditor, mentionedBy:string, meta?:(transaction:Transaction) => void) {
  editor.transact((transaction) => {
    transaction.insert(transaction.selection.from, judithNode(transaction.doc.type.schema, mentionedBy));
    meta?.(transaction);
  });
}

describe('UserMentionAuthorExtension', () => {
  afterEach(() => initEditorContext({}));

  it('records the current user on an inserted mention', () => {
    initEditorContext({ currentUserId: 4 });
    const editor = mountHeadlessEditor(createHeadlessEditorWithText('Thanks '));

    editor.insertInlineContent([mentionContent('5', 'Judith Roth')]);

    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth', '4').props]);
  });

  it('replaces the author a pasted mention brings along', () => {
    initEditorContext({ currentUserId: '4' });
    const editor = mountHeadlessEditor(createHeadlessEditorWithText('Thanks '));

    insertMentionNode(editor, '99');

    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth', '4').props]);
  });

  it('leaves a mention that arrives through Yjs alone', () => {
    initEditorContext({ currentUserId: '4' });
    const editor = mountHeadlessEditor(createHeadlessEditorWithText('Thanks '));

    insertMentionNode(editor, '99', (transaction) => transaction.setMeta(ySyncPluginKey, { isChangeOrigin: true }));

    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth', '99').props]);
  });

  it('clears the author a pasted mention brings along while the current user is unknown', () => {
    const editor = mountHeadlessEditor(createHeadlessEditorWithText('Thanks '));

    insertMentionNode(editor, '99');

    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth').props]);
  });

  it('records the author once when several steps of a transaction cover the same mention', () => {
    initEditorContext({ currentUserId: '4' });
    // Left unmounted, so applying the transaction does not already run the plugin.
    const { prosemirrorState: state } = createHeadlessEditorWithText('Thanks ');
    const { from } = state.selection;
    const transaction = state.tr.insertText('ab', from);
    transaction.insert(from + 1, judithNode(state.schema, '99'));

    const stamp = userMentionAuthorPlugin().spec.appendTransaction?.([transaction], state, state.apply(transaction));

    expect(stamp?.steps).toHaveLength(1);
  });

  it('keeps the author of mentions an edit does not touch', () => {
    initEditorContext({ currentUserId: '4' });
    const editor = mountHeadlessEditor(createHeadlessEditor([
      textContent('Thanks '), mentionContent('5', 'Judith Roth', '7'), textContent(' and more'),
    ]));

    placeCursorAfterText(editor, 'more');
    editor.insertInlineContent(['!']);
    editor.updateBlock(editor.document[0], { type: 'heading' });

    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth', '7').props]);
  });

  it('keeps the author of a mention in a moved block', () => {
    initEditorContext({ currentUserId: '4' });
    const editor = mountHeadlessEditor(createHeadlessEditorWithBlocks([
      paragraphWith(mentionContent('5', 'Judith Roth', '7')), paragraphWith('Last line'),
    ]));

    editor.setTextCursorPosition(editor.document[0], 'end');
    editor.moveBlocksDown();

    expect(editor.document.map((_block, index) => blockText(editor, index))).toEqual(['Last line', '']);
    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth', '7').props]);
  });

  it('keeps the author of a mention moved within the text', () => {
    initEditorContext({ currentUserId: '4' });
    const editor = mountHeadlessEditor(createHeadlessEditor([mentionContent('5', 'Judith Roth', '7'), textContent(' and more')]));
    const mentionPosition = nthInlineNodePosition(editor, USER_MENTION_TYPE);

    editor.transact((transaction) => {
      const mention = transaction.doc.nodeAt(mentionPosition)!;
      transaction.delete(mentionPosition, mentionPosition + mention.nodeSize);
      transaction.insert(mentionPosition + ' and'.length, mention);
    });

    expect(blockTextWithNodes(editor)).toEqual(' and[openProjectUserMention] more');
    expect(mentionsIn(editor)).toEqual([mentionContent('5', 'Judith Roth', '7').props]);
  });

  it('records the current user on a duplicated mention only', () => {
    initEditorContext({ currentUserId: '4' });
    const editor = mountHeadlessEditor(createHeadlessEditor([mentionContent('5', 'Judith Roth', '7'), textContent(' and')]));
    const mentionPosition = nthInlineNodePosition(editor, USER_MENTION_TYPE);

    placeCursorAfterText(editor, 'and');
    editor.transact((transaction) => {
      transaction.insert(transaction.selection.from, transaction.doc.nodeAt(mentionPosition)!);
    });

    expect(mentionsIn(editor)).toEqual([
      mentionContent('5', 'Judith Roth', '7').props,
      mentionContent('5', 'Judith Roth', '4').props,
    ]);
  });

  it('does not take over a mention another collaborator inserted', () => {
    const { editors: [mine, theirs], sync } = createCollaborativeHeadlessEditors();
    initEditorContext({ currentUserId: '7' });
    theirs.setTextCursorPosition(theirs.document[0], 'end');
    theirs.insertInlineContent([mentionContent('5', 'Judith Roth')]);

    initEditorContext({ currentUserId: '4' });
    sync();

    expect(mentionsIn(mine)).toEqual([mentionContent('5', 'Judith Roth', '7').props]);
  });
});
