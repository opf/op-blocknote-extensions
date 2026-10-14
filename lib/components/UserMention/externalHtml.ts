import { escapeHtmlAttribute, escapeHtmlText } from '../../utils/html';
import { USER_MENTION_TYPE } from '../../utils/nodeTypes';

export interface UserMentionProps {
  userId:string;
  name:string;
  /** Hocuspocus saves with the first connected user's token, so OpenProject reads who mentioned from here. */
  mentionedBy?:string;
}

/** The exact markup OpenProject stores for a user mention (see Users::ReplaceMentionsService). */
export function userMentionTag({ userId, name, mentionedBy }:UserMentionProps):string {
  const text = `@${name}`;
  const mentionedByAttribute = mentionedBy ? ` data-mentioned-by="${escapeHtmlAttribute(mentionedBy)}"` : '';
  return `<mention class="mention" data-id="${escapeHtmlAttribute(userId)}" data-type="user" `
    + `data-text="${escapeHtmlAttribute(text)}"${mentionedByAttribute}>${escapeHtmlText(text)}</mention>`;
}

function wrapperAttributes({ userId, name, mentionedBy }:UserMentionProps):Record<string, string> {
  return {
    'data-inline-content-type': USER_MENTION_TYPE,
    'data-user-id': userId,
    'data-name': name,
    ...(mentionedBy ? { 'data-mentioned-by': mentionedBy } : {}),
  };
}

export function buildUserMentionStoredDOM(props:UserMentionProps, document:Document):HTMLElement {
  const wrapper = document.createElement('span');
  for (const [attribute, value] of Object.entries(wrapperAttributes(props))) {
    wrapper.setAttribute(attribute, value);
  }
  wrapper.textContent = userMentionTag(props);
  return wrapper;
}

export function parseUserMentionExternalHTML(element:HTMLElement):UserMentionProps | undefined {
  const mentionedBy = element.getAttribute('data-mentioned-by') ?? '';

  // BlockNote's own wrapper omits the props at their default, so one without a user id is left to its content.
  if (element.getAttribute('data-inline-content-type') === USER_MENTION_TYPE && element.hasAttribute('data-user-id')) {
    return {
      userId: element.getAttribute('data-user-id') ?? '',
      name: element.getAttribute('data-name') ?? '',
      mentionedBy,
    };
  }

  const userId = element.getAttribute('data-id');
  if (element.tagName.toLowerCase() === 'mention' && element.getAttribute('data-type') === 'user' && userId) {
    return {
      userId,
      name: (element.getAttribute('data-text') ?? '').replace(/^@/, ''),
      mentionedBy,
    };
  }

  return undefined;
}
