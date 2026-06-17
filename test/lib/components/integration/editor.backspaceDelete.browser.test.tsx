import { describe, it, expect } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { renderEditor } from '../../../helpers/renderEditor';
import {
  insertInlineWorkPackageViaHash,
  insertInlineWorkPackageViaSlashMenu,
  convertToCompactCard,
} from '../../../helpers/editorHelpers';

describe('Backspace - inline WP', () => {
  it('deletes text typed after inline chip, character by character', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('#');

    const editor = page.getByRole('textbox');
    await userEvent.type(editor, 'abc');
    await expect.element(editor).toHaveTextContent('abc');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('abc');
    await expect.element(editor).toHaveTextContent('ab');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('ab');
    await expect.element(editor).toHaveTextContent('a');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('a');

    await expect.element(page.getByText('#123')).toBeVisible();
  });

  it('deletes the inline WP itself with Backspace', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('#');

    // Cursor is right after the WP
    await userEvent.keyboard('{Backspace}');

    await expect.element(page.getByText('#123')).not.toBeInTheDocument();
  });

  it('deletes typed text and then the WP with successive Backspace presses', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('#');

    const editor = page.getByRole('textbox');
    await userEvent.type(editor, 'hi');
    await expect.element(editor).toHaveTextContent('hi');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).toHaveTextContent('h');
    await expect.element(editor).not.toHaveTextContent('hi');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('h');

    // Cursor is now right after the WP - Backspace removes the WP
    await userEvent.keyboard('{Backspace}');
    await expect.element(page.getByText('#123')).not.toBeInTheDocument();
  });
});

describe('Backspace - block WP', () => {
  it('deletes text typed after a block WP, character by character', async () => {
    renderEditor();
    await insertInlineWorkPackageViaSlashMenu();
    await convertToCompactCard();
    await expect.element(page.getByTestId('block-card')).toBeVisible();

    // After conversion the cursor lands in the empty paragraph following the block card
    const editor = page.getByRole('textbox');
    await userEvent.type(editor, 'abc');
    await expect.element(editor).toHaveTextContent('abc');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('abc');
    await expect.element(editor).toHaveTextContent('ab');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('ab');
    await expect.element(editor).toHaveTextContent('a');

    await userEvent.keyboard('{Backspace}');
    await expect.element(editor).not.toHaveTextContent('a');

    await expect.element(page.getByTestId('block-card')).toBeVisible();
  });
});

describe('Delete - inline WP', () => {
  it('deletes text in front of the cursor, character by character', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('#');

    const editor = page.getByRole('textbox');
    await userEvent.type(editor, 'abc');
    await expect.element(editor).toHaveTextContent('abc');

    // Move cursor before 'a' (right after the chip)
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');

    await userEvent.keyboard('{Delete}');
    await expect.element(editor).not.toHaveTextContent('abc');
    await expect.element(editor).toHaveTextContent('bc');

    await userEvent.keyboard('{Delete}');
    await expect.element(editor).not.toHaveTextContent('bc');
    await expect.element(editor).toHaveTextContent('c');

    await userEvent.keyboard('{Delete}');
    await expect.element(editor).not.toHaveTextContent('c');

    await expect.element(page.getByText('#123')).toBeVisible();
  });

  it('deletes the inline WP itself with Delete', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('#');

    // Move cursor before the chip
    await userEvent.keyboard('{ArrowLeft}');

    await userEvent.keyboard('{Delete}');

    await expect.element(page.getByText('#123')).not.toBeInTheDocument();
  });

});

describe('Delete - block WP', () => {
  it('deletes text in front of the cursor, character by character', async () => {
    renderEditor();
    await insertInlineWorkPackageViaSlashMenu();
    await convertToCompactCard();
    await expect.element(page.getByTestId('block-card')).toBeVisible();

    // After conversion the cursor lands in the empty paragraph following the block card
    const editor = page.getByRole('textbox');
    await userEvent.type(editor, 'abc');
    await expect.element(editor).toHaveTextContent('abc');

    // Move cursor before 'a'
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');

    await userEvent.keyboard('{Delete}');
    await expect.element(editor).not.toHaveTextContent('abc');
    await expect.element(editor).toHaveTextContent('bc');

    await userEvent.keyboard('{Delete}');
    await expect.element(editor).not.toHaveTextContent('bc');
    await expect.element(editor).toHaveTextContent('c');

    await userEvent.keyboard('{Delete}');
    await expect.element(editor).not.toHaveTextContent('c');

    await expect.element(page.getByTestId('block-card')).toBeVisible();
  });
});
