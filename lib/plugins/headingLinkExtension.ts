import { createExtension } from '@blocknote/core';
import type { Node as ProsemirrorNode } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { EditorView } from 'prosemirror-view';
import { blockIdFromHash } from '../utils/headingAnchor';
import { createHeadingLinkButton } from './headingLinkButton';
import { adoptHeadingLinkStyles } from './headingLinkStyles';

const USER_INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

function buildDecorations(doc:ProsemirrorNode):DecorationSet {
  const decorations:Decoration[] = [];

  doc.descendants((node, pos) => {
    const content = node.firstChild;
    const blockId = String(node.attrs.id ?? '');
    if (node.type.name === 'blockContainer' && content?.type.name === 'heading' && content.content.size > 0 && blockId) {
      const headingStart = pos + 1;
      const headingContentEnd = headingStart + content.nodeSize - 1;
      decorations.push(
        Decoration.widget(headingContentEnd, () => createHeadingLinkButton(blockId), {
          key: `heading-link-${blockId}`,
          side: 1,
          ignoreSelection: true,
          stopEvent: () => true,
        }),
      );
    }
    // Headings can be nested in other blocks' children, but never inside text.
    return !node.isTextblock;
  });

  return DecorationSet.create(doc, decorations);
}

const BLOCK_CONTAINER = '[data-node-type="blockContainer"]';
const COLLAPSED_TOGGLE_BUTTON = ':scope > .bn-block-content .bn-toggle-wrapper[data-show-children="false"] > .bn-toggle-button';

// Through its own button, so BlockNote also remembers the toggle as open.
function openCollapsedToggles(heading:Element) {
  let block = heading.closest(BLOCK_CONTAINER)?.parentElement?.closest(BLOCK_CONTAINER);
  while (block) {
    block.querySelector<HTMLButtonElement>(COLLAPSED_TOGGLE_BUTTON)?.click();
    block = block.parentElement?.closest(BLOCK_CONTAINER);
  }
}

// The browser cannot reach into the shadow root, and content above the heading keeps loading.
function followAnchor(view:EditorView) {
  let targetId:string | null = null;

  const scrollToTarget = () => {
    if (!targetId) return;
    const heading = view.dom.querySelector(`[data-id="${CSS.escape(targetId)}"] > [data-content-type="heading"]`);
    if (!heading) return;

    openCollapsedToggles(heading);
    heading.scrollIntoView({ block: 'start' });
  };

  const follow = () => {
    targetId = blockIdFromHash(window.location.hash);
    scrollToTarget();
  };

  const stopFollowing = () => { targetId = null; };

  const resizeObserver = new ResizeObserver(scrollToTarget);
  resizeObserver.observe(view.dom);
  window.addEventListener('hashchange', follow);
  for (const type of USER_INPUT_EVENTS) {
    window.addEventListener(type, stopFollowing, { capture: true, passive: true });
  }
  follow();

  return {
    update: scrollToTarget,
    destroy: () => {
      resizeObserver.disconnect();
      window.removeEventListener('hashchange', follow);
      for (const type of USER_INPUT_EVENTS) {
        window.removeEventListener(type, stopFollowing, { capture: true });
      }
    },
  };
}

const pluginKey = new PluginKey<DecorationSet>('headingLink');

export const HeadingLinkExtension = createExtension(() => ({
  key: 'headingLink',
  prosemirrorPlugins: [
    new Plugin<DecorationSet>({
      key: pluginKey,
      state: {
        init: (_, state) => buildDecorations(state.doc),
        apply: (transaction, decorations) =>
          transaction.docChanged ? buildDecorations(transaction.doc) : decorations,
      },
      props: {
        decorations: (state) => pluginKey.getState(state),
      },
      view: (view) => {
        adoptHeadingLinkStyles(view.root);
        return followAnchor(view);
      },
    }),
  ],
}))();
