import { Plugin, PluginKey } from 'prosemirror-state';
import type { Transaction } from 'prosemirror-state';
import type { Node as ProsemirrorNode } from 'prosemirror-model';
import { contextCurrentUserId } from '../services/editorContext';
import { USER_MENTION_TYPE } from '../utils/nodeTypes';

// y-prosemirror's `ySyncPluginKey`, set on every transaction from Yjs (collaborators, initial sync, undo).
// Matched by name, as BlockNote does, so the bundle does not need y-prosemirror.
const Y_SYNC_META_KEY = 'y-sync$';

interface InsertedRange { from:number; to:number }

interface LocalChanges {
  insertedRanges:InsertedRange[];
  removedMentions:Map<string, number>;
}

function isFromYjs(transaction:Transaction):boolean {
  return transaction.getMeta(Y_SYNC_META_KEY) !== undefined;
}

function isUserMention(node:ProsemirrorNode):boolean {
  return node.type.name === USER_MENTION_TYPE;
}

function mentionKey(node:ProsemirrorNode):string {
  return JSON.stringify([node.attrs.userId, node.attrs.mentionedBy]);
}

/** The ranges of the final document that local transactions inserted, and the mentions they removed. */
function localChanges(transactions:readonly Transaction[]):LocalChanges {
  let insertedRanges:InsertedRange[] = [];
  const removedMentions = new Map<string, number>();
  for (const transaction of transactions) {
    transaction.steps.forEach((step, index) => {
      const stepMap = step.getMap();
      insertedRanges = insertedRanges
        .map(({ from, to }) => ({ from: stepMap.map(from, 1), to: stepMap.map(to, -1) }))
        .filter(({ from, to }) => from < to);
      if (isFromYjs(transaction)) return;

      stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
        if (newStart < newEnd) insertedRanges.push({ from: newStart, to: newEnd });
        transaction.docs[index].nodesBetween(oldStart, oldEnd, (node) => {
          if (!isUserMention(node)) return;
          const key = mentionKey(node);
          removedMentions.set(key, (removedMentions.get(key) ?? 0) + 1);
        });
      });
    });
  }
  return { insertedRanges, removedMentions };
}

/**
 * Records the current user as `mentionedBy` on every user mention a local transaction inserts, unless the
 * same transaction removed it (a move). The prop travels with the node, so a copy would keep the first author.
 */
export function userMentionAuthorPlugin():Plugin {
  return new Plugin({
    key: new PluginKey('userMentionAuthor'),
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) return null;

      // No author is better than a wrong one.
      const mentionedBy = contextCurrentUserId() ?? '';
      const { insertedRanges, removedMentions } = localChanges(transactions);
      const stamp = newState.tr;
      const seen = new Set<number>();
      for (const { from, to } of insertedRanges) {
        newState.doc.nodesBetween(from, to, (node, position) => {
          if (!isUserMention(node) || seen.has(position)) return;
          seen.add(position);

          const key = mentionKey(node);
          const moved = removedMentions.get(key) ?? 0;
          if (moved > 0) {
            removedMentions.set(key, moved - 1);
          } else if (node.attrs.mentionedBy !== mentionedBy) {
            stamp.setNodeAttribute(position, 'mentionedBy', mentionedBy);
          }
        });
      }
      return stamp.docChanged ? stamp : null;
    },
  });
}
