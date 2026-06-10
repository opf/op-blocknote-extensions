import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from 'vitest-browser-react';
import { page, userEvent } from 'vitest/browser';
import { renderEditor } from '../../../helpers/renderEditor';
import {
  insertInlineWorkPackageViaSlashMenu,
  insertInlineWorkPackageViaHash,
  openInlineWorkPackagePopover,
} from '../../../helpers/editorHelpers';

describe('Inline chip - single chip copy', () => {
  afterEach(() => cleanup());

  it('copies a chip when the chip is clicked and Ctrl+C is pressed without surrounding text', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('###');

    await openInlineWorkPackagePopover();
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Control>}v{/Control}');

    expect(document.querySelectorAll('.op-bn-inline-wp').length).toBe(2);
  });

  it('pasted copy is independent of the original after single-chip copy', async () => {
    renderEditor();
    await insertInlineWorkPackageViaHash('###');

    await openInlineWorkPackagePopover();
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Control>}v{/Control}');

    const chips = document.querySelectorAll('.op-bn-inline-wp');
    expect(chips.length).toBe(2);

    await userEvent.click(chips[1]);
    await expect.element(page.getByTestId('popover-content')).toBeVisible();
    await userEvent.click(page.getByTitle('Change size'));
    await expect.element(page.getByTestId('size-menu')).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Tiny', exact: true }));

    expect((await page.getByText('In Progress').all()).length).toBe(1);
  });
});

describe('Inline chip - copy/paste independence', () => {
  it('resizing the original does not affect the copy', async () => {
    renderEditor();
    await insertInlineWorkPackageViaSlashMenu();

    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Control>}{End}{/Control}');
    await userEvent.keyboard('{Control>}v{/Control}');

    expect((await page.getByText('#123').all()).length).toBe(2);

    await userEvent.click(page.getByText('#123').nth(0));
    await expect.element(page.getByTestId('popover-content')).toBeVisible();
    await userEvent.click(page.getByTitle('Change size'));
    await expect.element(page.getByTestId('size-menu')).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Tiny', exact: true }));

    const statusBadges = page.getByText('In Progress');
    expect((await statusBadges.all()).length).toBe(1);
  });

  it('resizing the copy does not affect the original', async () => {
    renderEditor();
    await insertInlineWorkPackageViaSlashMenu();

    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Control>}{End}{/Control}');
    await userEvent.keyboard('{Control>}v{/Control}');

    expect((await page.getByText('#123').all()).length).toBe(2);

    await userEvent.click(page.getByText('#123').nth(1));
    await expect.element(page.getByTestId('popover-content')).toBeVisible();
    await userEvent.click(page.getByTitle('Change size'));
    await expect.element(page.getByTestId('size-menu')).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Tiny', exact: true }));

    const statusBadges = page.getByText('In Progress');
    expect((await statusBadges.all()).length).toBe(1);
  });

  it('removing the copy does not remove the original', async () => {
    renderEditor();
    await insertInlineWorkPackageViaSlashMenu();

    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Control>}{End}{/Control}');
    await userEvent.keyboard('{Control>}v{/Control}');

    expect((await page.getByText('#123').all()).length).toBe(2);

    await userEvent.click(page.getByText('#123').nth(1));
    await expect.element(page.getByTestId('popover-content')).toBeVisible();
    await userEvent.click(page.getByTestId('remove-btn'));

    expect((await page.getByText('#123').all()).length).toBe(1);
    await expect.element(page.getByText('In Progress')).toBeVisible();
  });

  it('removing the original does not remove the copy', async () => {
    renderEditor();
    await insertInlineWorkPackageViaSlashMenu();

    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.keyboard('{Control>}c{/Control}');
    await userEvent.keyboard('{Control>}{End}{/Control}');
    await userEvent.keyboard('{Control>}v{/Control}');

    expect((await page.getByText('#123').all()).length).toBe(2);

    await userEvent.click(page.getByText('#123').nth(0));
    await expect.element(page.getByTestId('popover-content')).toBeVisible();
    await userEvent.click(page.getByTestId('remove-btn'));

    expect((await page.getByText('#123').all()).length).toBe(1);
    await expect.element(page.getByText('In Progress')).toBeVisible();
  });
});