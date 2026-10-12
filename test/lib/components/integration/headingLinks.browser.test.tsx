import { describe, it, expect, vi, afterEach, onTestFinished } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { renderEditor, renderEditorInShadowDom } from '../../../helpers/renderEditor';
import { tapElement } from '../../../helpers/editorHelpers';
import { HeadingLinkExtension } from '../../../../lib';

const paragraphs = (count:number) =>
  Array.from({ length: count }, (_, index) => ({ type: 'paragraph', content: `Paragraph ${index + 1}` }));

const headingFarDown = [
  ...paragraphs(60),
  { id: 'target', type: 'heading', props: { level: 2 }, content: 'Target heading' },
  ...paragraphs(60),
];

const sharedOptions = {
  extensions: [HeadingLinkExtension],
  initialContent: [{ id: 'target', type: 'heading', content: 'Intro' }],
};

function setHash(hash:string) {
  history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

function isInViewport(element:Element) {
  const { top, bottom, height } = element.getBoundingClientRect();
  return height > 0 && top >= 0 && bottom <= window.innerHeight;
}

const headingElement = (root:ParentNode = document) =>
  root.querySelector('[data-id="target"] [data-content-type="heading"]');

const linkButtons = (root:ParentNode = document) =>
  root.querySelectorAll<HTMLButtonElement>('.op-bn-heading-link');

async function linkButton(root:ParentNode = document) {
  await expect.poll(() => linkButtons(root).length).toBe(1);
  return linkButtons(root)[0];
}

// Chrome's scroll anchoring would hide the shift.
function growFirstBlock() {
  const style = document.createElement('style');
  style.textContent = `
    html { overflow-anchor: none; }
    [data-node-type="blockContainer"]:has([data-content-type="paragraph"]) { padding-top: 60px; }
  `;
  document.head.append(style);
  onTestFinished(() => { style.remove(); });
}

function takeOver() {
  window.dispatchEvent(new PointerEvent('pointerdown'));
}

function mockClipboard(write:() => Promise<void> = () => Promise.resolve()) {
  return vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(write);
}

afterEach(() => {
  setHash('');
  vi.restoreAllMocks();
});

describe('Heading links', () => {
  it('adds a link button to every heading and to nothing else', async () => {
    renderEditor({
      extensions: [HeadingLinkExtension],
      initialContent: [
        { type: 'heading', props: { level: 1 }, content: 'One' },
        { type: 'paragraph', content: 'Text' },
        { type: 'heading', props: { level: 2 }, content: 'Two' },
        { type: 'heading', props: { level: 3 }, content: 'Three' },
      ],
    });

    await expect.poll(() => linkButtons().length).toBe(3);
    for (const button of linkButtons()) {
      expect(button.closest('[data-content-type="heading"]')).not.toBeNull();
    }
  });

  it('keeps the heading named by its own text for assistive technology', async () => {
    renderEditor({
      extensions: [HeadingLinkExtension],
      initialContent: [{ type: 'heading', content: 'Intro' }],
    });
    await linkButton();

    await expect.element(page.getByRole('heading', { name: 'Intro', exact: true })).toBeInTheDocument();
  });

  it.each([
    ['the page', async () => { await renderEditor(sharedOptions); return document; }],
    ['a shadow root', async () => (await renderEditorInShadowDom(sharedOptions)).shadowRoot],
  ])('shows the button only while the pointer is over its heading, in %s', async (_, render) => {
    const root = await render();
    const button = await linkButton(root);
    const heading = headingElement(root)!;
    // The pointer may still rest where an earlier test left it.
    await userEvent.unhover(heading);
    expect(getComputedStyle(button).opacity).toBe('0');

    await userEvent.hover(heading);
    await expect.poll(() => getComputedStyle(button).opacity).toBe('1');

    await userEvent.unhover(heading);
    await expect.poll(() => getComputedStyle(button).opacity).toBe('0');
  });

  it('copies a link to the heading without changing the address', async () => {
    const writeText = mockClipboard();
    renderEditor(sharedOptions);
    const button = await linkButton();

    await userEvent.click(button);

    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      `${location.origin}${location.pathname}${location.search}#heading-target`,
    );
    await expect.poll(() => button.title).toBe('Link copied');
    expect(location.hash).toBe('');
  });

  it('says so when the clipboard refuses the link', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    renderEditor(sharedOptions);
    const button = await linkButton();

    await userEvent.click(button);

    await expect.poll(() => button.title).toBe('Could not copy link');
  });

  it('copies on the first tap, once', async () => {
    const writeText = mockClipboard();
    renderEditor(sharedOptions);
    const button = await linkButton();

    tapElement(button);
    button.click();

    expect(writeText).toHaveBeenCalledOnce();
  });

  it('leaves the caret where it was', async () => {
    mockClipboard();
    let editor:any;
    renderEditor({
      extensions: [HeadingLinkExtension],
      onEditor: (instance) => { editor = instance; },
      initialContent: [
        { type: 'heading', content: 'Intro' },
        { id: 'body', type: 'paragraph', content: 'Body' },
      ],
    });
    await userEvent.click(page.getByText('Body'));

    await userEvent.click(await linkButton());

    expect(editor.getTextCursorPosition().block.id).toBe('body');
  });

  it('copies from a read-only document', async () => {
    const writeText = mockClipboard();
    renderEditor({ ...sharedOptions, editable: false });

    await userEvent.click(await linkButton());

    expect(writeText).toHaveBeenCalledOnce();
  });

  it('scrolls to the heading the address points to', async () => {
    setHash('#heading-target');
    const { shadowRoot } = await renderEditorInShadowDom({
      extensions: [HeadingLinkExtension],
      initialContent: headingFarDown,
    });

    await expect.poll(() => headingElement(shadowRoot)).not.toBeNull();
    await expect.poll(() => isInViewport(headingElement(shadowRoot)!)).toBe(true);
    expect(location.hash).toBe('#heading-target');
  });

  it('scrolls once the heading arrives after the editor', async () => {
    setHash('#heading-target');
    let editor:any;
    renderEditor({
      extensions: [HeadingLinkExtension],
      onEditor: (instance) => { editor = instance; },
    });
    await expect.poll(() => editor !== undefined).toBe(true);

    editor.replaceBlocks(editor.document, headingFarDown);

    await expect.poll(() => headingElement() && isInViewport(headingElement()!)).toBe(true);
  });

  it('opens the collapsed toggles around the heading it scrolls to', async () => {
    setHash('#heading-target');
    renderEditor({
      extensions: [HeadingLinkExtension],
      initialContent: [
        ...paragraphs(60),
        {
          type: 'toggleListItem',
          content: 'Outer toggle',
          children: [{
            type: 'toggleListItem',
            content: 'Inner toggle',
            children: [{ id: 'target', type: 'heading', props: { level: 2 }, content: 'Target heading' }],
          }],
        },
        ...paragraphs(60),
      ],
    });

    await expect.poll(() => headingElement() && isInViewport(headingElement()!)).toBe(true);
  });

  it('keeps the heading in view while the content above it grows', async () => {
    setHash('#heading-target');
    renderEditor({ extensions: [HeadingLinkExtension], initialContent: headingFarDown });
    await expect.poll(() => headingElement() && isInViewport(headingElement()!)).toBe(true);

    growFirstBlock();

    await expect.poll(() => isInViewport(headingElement()!)).toBe(true);
  });

  it('stops following the heading once the user takes over', async () => {
    setHash('#heading-target');
    renderEditor({ extensions: [HeadingLinkExtension], initialContent: headingFarDown });
    await expect.poll(() => headingElement() && isInViewport(headingElement()!)).toBe(true);

    takeOver();
    growFirstBlock();

    await expect.poll(() => isInViewport(headingElement()!)).toBe(false);
  });

  it('does not jump to a heading that appears after the user took over', async () => {
    setHash('#heading-target');
    let editor:any;
    renderEditor({
      extensions: [HeadingLinkExtension],
      onEditor: (instance) => { editor = instance; },
    });
    await expect.poll(() => editor !== undefined).toBe(true);

    takeOver();
    editor.replaceBlocks(editor.document, headingFarDown);

    await expect.poll(() => headingElement()).not.toBeNull();
    expect(window.scrollY).toBe(0);
  });

  it('scrolls when the address changes to another heading', async () => {
    renderEditor({ extensions: [HeadingLinkExtension], initialContent: headingFarDown });
    await expect.poll(() => headingElement()).not.toBeNull();
    expect(isInViewport(headingElement()!)).toBe(false);

    location.hash = '#heading-target';

    await expect.poll(() => isInViewport(headingElement()!)).toBe(true);
  });

  it('ignores an address that names no heading', async () => {
    setHash('#heading-missing');
    renderEditor({ extensions: [HeadingLinkExtension], initialContent: headingFarDown });

    await expect.poll(() => headingElement()).not.toBeNull();
    expect(window.scrollY).toBe(0);
  });

  it('opens the document when the address holds a malformed anchor', async () => {
    setHash('#heading-50%');
    renderEditor(sharedOptions);

    expect(await linkButton()).toBeDefined();
  });
});
