import { createExtension } from '@blocknote/core';
import { userMentionAuthorPlugin } from './userMentionAuthorPlugin';

// Has to be passed in `extensions`: BlockNote only registers the extensions of block specs, not of inline content specs.
export const UserMentionAuthorExtension = createExtension(() => ({
  key: 'userMentionAuthor',
  prosemirrorPlugins: [userMentionAuthorPlugin()],
}))();
