import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { renderEditor } from '../../../helpers/renderEditor';
import {
  insertInlineWorkPackageViaHash,
  insertInlineWorkPackageViaHashWithTextBefore,
  openInlineWorkPackagePopover,
} from '../../../helpers/editorHelpers';

afterEach(() => cleanup());

async function setupEditorWithChipAndText() {
  renderEditor();
  await insertInlineWorkPackageViaHash('###');
  await expect.element(page.getByText('Fix login bug')).toBeVisible();
  await userEvent.click(page.getByRole('textbox'));
  await userEvent.keyboard('{Enter}{Enter}');
  await userEvent.keyboard('here');
  await expect.element(page.getByText('here')).toBeVisible();
}

describe('Chip keyboard deletion (popover open)', () => {
  it('Backspace removes the chip and leaves other content intact', async () => {
    await setupEditorWithChipAndText();

    await openInlineWorkPackagePopover();
    await expect.element(page.getByTestId('popover-content')).toBeVisible();

    await userEvent.keyboard('{Backspace}');

    await expect.element(page.getByText('Fix login bug')).not.toBeInTheDocument();
    await expect.element(page.getByTestId('popover-content')).not.toBeInTheDocument();
    await expect.element(page.getByText('here')).toBeVisible();
  });

  it('Delete removes the chip and leaves other content intact', async () => {
    await setupEditorWithChipAndText();

    await openInlineWorkPackagePopover();
    await expect.element(page.getByTestId('popover-content')).toBeVisible();

    await userEvent.keyboard('{Delete}');

    await expect.element(page.getByText('Fix login bug')).not.toBeInTheDocument();
    await expect.element(page.getByTestId('popover-content')).not.toBeInTheDocument();
    await expect.element(page.getByText('here')).toBeVisible();
  });
});

describe('Cursor position after chip keyboard deletion', () => {
  async function setupEditorWithChipBetweenText() {
    renderEditor();
    await insertInlineWorkPackageViaHashWithTextBefore('before');
    // cursor lands after the chip - type to create "before[chip]AFTER" in one block
    await userEvent.keyboard('AFTER');
  }

  it('Backspace: cursor lands where the chip was', async () => {
    await setupEditorWithChipBetweenText();

    await openInlineWorkPackagePopover();
    await userEvent.keyboard('{Backspace}');

    // typing HERE should appear exactly where the chip was
    await userEvent.keyboard('HERE');
    await expect.element(page.getByRole('textbox')).toHaveTextContent('beforeHEREAFTER');
  });

  it('Delete: cursor lands where the chip was', async () => {
    await setupEditorWithChipBetweenText();

    await openInlineWorkPackagePopover();
    await userEvent.keyboard('{Delete}');

    await userEvent.keyboard('HERE');
    await expect.element(page.getByRole('textbox')).toHaveTextContent('beforeHEREAFTER');
  });
});
