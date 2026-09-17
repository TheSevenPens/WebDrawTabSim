import { test, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';

const root = resolve(import.meta.dirname, '../..');
const references = JSON.parse(readFileSync(resolve(root, 'visual/references.json'), 'utf8'));
const scene = name => JSON.parse(readFileSync(resolve(root, `test/fixtures/scenes/reference/${name}.json`), 'utf8'));
const url = 'http://127.0.0.1:4174/WebDrawTabSim/';
const errorsByPage = new WeakMap();

test.beforeEach(async ({ page, browser }, info) => {
    const errors = [];
    errorsByPage.set(page, errors);
    page.on('pageerror', error => errors.push(error.message));
    // Fail on rendering errors as well as JavaScript exceptions.
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${url}visual/runner.html`);
    await page.waitForFunction(() => !!window.referenceScene);
    const metadata = await page.evaluate(() => window.referenceScene.metadata());
    expect(metadata.renderer).toMatch(/SwiftShader/i);
    expect(metadata.liveAnimationFrame).toBeNull();
    expect(metadata.damping).toBe(false);
    expect(metadata.fontLoaded).toBe(true);
    const environment = { ...metadata, browserVersion: browser.version(), platform: process.platform, node: process.version,
        osRelease: os.release(), architecture: process.arch,
        playwright: JSON.parse(readFileSync(resolve(root, 'node_modules/@playwright/test/package.json'))).version,
        fontPackage: JSON.parse(readFileSync(resolve(root, 'node_modules/@fontsource/noto-sans/package.json'))).version,
        viewport: { width: 1280, height: 900 }, sceneContainer: { width: 960, height: 720 },
        threshold: 0.15, maxDiffPixelRatio: 0.002 };
    await info.attach('environment', { body: JSON.stringify(environment, null, 2), contentType: 'application/json' });
    if (info.config.updateSnapshots === 'all') {
        if (process.env.CI) throw new Error('Do not update reference images in CI');
        const directory = resolve(root, `visual/baselines/${process.platform}`);
        mkdirSync(directory, { recursive: true });
        writeFileSync(resolve(directory, 'environment.json'), JSON.stringify(environment, null, 2) + '\n');
    } else {
        const baseline = JSON.parse(readFileSync(resolve(root, `visual/baselines/${process.platform}/environment.json`), 'utf8'));
        for (const key of ['browserVersion', 'threeRevision', 'playwright', 'fontPackage', 'pixelRatio', 'font', 'renderer'])
            expect(environment[key], `Baseline environment ${key}`).toEqual(baseline[key]);
    }
});

test.afterEach(async ({ page }) => {
    expect(errorsByPage.get(page) ?? []).toEqual([]);
});

for (const reference of references.scenes) {
    test(reference.name, async ({ page }) => {
        const actual = await page.evaluate(document => window.referenceScene.load(document), scene(reference.name));
        for (const key of ['tip', 'quaternion', 'cursor']) {
            actual[key].forEach((value, index) =>
                expect(Math.abs(value - reference.expected[key][index]), `${key}[${index}]`).toBeLessThan(references.numericTolerance));
        }
        const canvas = page.locator('#viewer canvas');
        await expect(canvas).toHaveScreenshot(`${reference.name}.png`);
        // Check resize round-trip against the same frozen reference, not a new baseline.
        await page.evaluate(() => window.referenceScene.resize(640, 480));
        await page.evaluate(() => window.referenceScene.resize(960, 720));
        await expect(canvas).toHaveScreenshot(`${reference.name}.png`);
    });
}

test('orthographic export preserves the live viewport', async ({ page }) => {
    await page.evaluate(document => window.referenceScene.load(document), scene('annotated-orthographic'));
    const data = await page.evaluate(() => window.referenceScene.exportPng(480, 270));
    const png = Buffer.from(data.split(',')[1], 'base64');
    expect(png.readUInt32BE(16)).toBe(480);
    expect(png.readUInt32BE(20)).toBe(270);
    expect(png).toMatchSnapshot('orthographic-export.png');
    await expect(page.locator('#viewer canvas')).toHaveScreenshot('annotated-orthographic.png');
});

test('scene changes alter pixels and repeated teardown removes owned resources', async ({ page }) => {
    const document = scene('nib-closeup');
    await page.evaluate(document => window.referenceScene.load(document), document);
    const before = await page.locator('#viewer canvas').screenshot();
    document.pose.tiltAltitude = 0;
    await page.evaluate(document => window.referenceScene.load(document), document);
    const after = await page.locator('#viewer canvas').screenshot();
    expect(before.equals(after)).toBe(false);
    for (let i = 0; i < 3; i++) {
        expect(await page.evaluate(() => window.referenceScene.dispose())).toEqual({ canvasCount: 0, resources: 0, frame: null });
        await page.evaluate(() => window.referenceScene.recreate());
        await page.evaluate(document => window.referenceScene.load(document), document);
    }
});

test('production UI loads a reference scene and undo restores the prior view', async ({ page }) => {
    await page.goto(url);
    await page.getByRole('heading', { name: 'SevenPens DrawTabSim' }).waitFor();
    await page.getByLabel('Load scene file').setInputFiles(resolve(root, 'test/fixtures/scenes/reference/display-high-tilt.json'));
    await expect(page.getByRole('status')).toContainText('Loaded display-high-tilt.json');
    await page.getByRole('button', { name: 'Pen Or', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Tilt altitude', exact: true })).toHaveValue('60');
    await expect(page.getByRole('checkbox', { name: 'Dark tablet', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Tilt altitude', exact: true })).toHaveValue('0');
    await expect(page.getByRole('checkbox', { name: 'Dark tablet', exact: true })).not.toBeChecked();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Tilt altitude', exact: true })).toHaveValue('60');
});
