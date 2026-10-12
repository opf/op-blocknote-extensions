import i18n from '../services/i18n.ts';
import { bindTapActivation } from '../utils/tapActivation';
import { headingAnchor } from '../utils/headingAnchor';

const FEEDBACK_DURATION = 2000;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// The 16px octicons link, check and alert. ProseMirror owns this element, so
// the React icon components cannot render it.
const ICON_PATHS = {
  copy: 'm7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z',
  copied: 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
  failed: 'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
} as const;

type ButtonState = keyof typeof ICON_PATHS;

function showState(button:HTMLButtonElement, icon:SVGPathElement, state:ButtonState) {
  button.title = i18n.t(`headingLink.${state}`);
  button.dataset.state = state;
  icon.setAttribute('d', ICON_PATHS[state]);
}

export function createHeadingLinkButton(blockId:string):HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'op-bn-heading-link';
  button.contentEditable = 'false';
  button.tabIndex = -1;
  // Inside the heading, a label would become part of the heading's name.
  button.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'currentColor');
  const icon = document.createElementNS(SVG_NAMESPACE, 'path');
  svg.append(icon);
  button.append(svg);
  showState(button, icon, 'copy');

  let resetTimer:number | undefined;
  const showFeedback = (state:ButtonState) => {
    showState(button, icon, state);
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => { showState(button, icon, 'copy'); }, FEEDBACK_DURATION);
  };

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.hash = headingAnchor(blockId);
    try {
      await navigator.clipboard.writeText(url.href);
      showFeedback('copied');
    } catch {
      showFeedback('failed');
    }
  };

  // Keeps the browser from moving the caret or focus into the heading.
  button.addEventListener('mousedown', (event) => { event.preventDefault(); });
  bindTapActivation(button, () => { void copyLink(); });

  return button;
}
