import { test, expect } from '@playwright/test';

test('bundled sample plays, steps through source samples, seeks and cancels on reset', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4174/WebDrawTabSim/');
    await page.getByRole('button', { name: 'Play sample stroke', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    // Seeking chooses the last reading at a tied timestamp; stepping retains all three.
    await expect(page.getByTestId('sample-reading')).toContainText('Sample 3 of 418');
    await page.getByRole('button', { name: 'Previous sample', exact: true }).click();
    await page.getByRole('button', { name: 'Previous sample', exact: true }).click();
    await expect(page.getByTestId('sample-reading')).toContainText('Sample 1 of 418');
    await expect(page.getByTestId('sample-reading')).toContainText('Approach');
    await page.getByRole('button', { name: 'Next sample', exact: true }).click();
    await expect(page.getByTestId('sample-reading')).toContainText('Sample 2 of 418');
    await page.getByRole('slider', { name: 'Playback time' }).fill('1000');
    await expect(page.getByTestId('sample-reading')).toContainText('Contact');
    const canvas = page.locator('#viewer canvas');
    const contact = await canvas.screenshot();
    await page.screenshot({ path: 'test-results/sample-recording-contact.png' });
    await page.getByRole('slider', { name: 'Playback time' }).fill('2599');
    await expect(page.getByTestId('sample-reading')).toContainText('Departure');
    expect((await canvas.screenshot()).equals(contact)).toBe(false);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Reset pen', exact: true }).click();
    await expect(page.getByTestId('sample-reading')).toHaveCount(0);
    expect(errors).toEqual([]);
});
