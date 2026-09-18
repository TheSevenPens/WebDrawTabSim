import { test, expect } from '@playwright/test';
import os from 'node:os';

test('live rendering settles, wakes for edits, preserves damping and restores exports', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4174/WebDrawTabSim/visual/runner.html');
    await page.waitForFunction(() => !!window.referenceScene);
    await page.evaluate(() => window.referenceScene.enableLive());
    const state = () => page.evaluate(() => window.referenceScene.liveState());
    // OrbitControls damping decays per frame. Hosted SwiftShader can render far
    // fewer frames per second than a workstation; this checks eventual idle,
    // not a GPU-speed target. Keep the zero-idle-render assertions below.
    const settled = () => expect.poll(async () => (await state()).pending, { timeout: 60_000 }).toBe(false);
    await settled();
    const idle = await state();
    await page.waitForTimeout(250);
    expect((await state()).renders).toBe(idle.renders);
    for (const [method, value] of [['setGridVisible', false], ['setDarkTablet', true],
        ['setCursorOffsetX', 10], ['setTiltAltitude', 40], ['setAxonometricView', true],
        ['setPenBodyFormat', 'solid']]) {
        const before = (await state()).renders;
        await page.evaluate(([method, value]) => window.referenceScene.liveEdit(method, value), [method, value]);
        await expect.poll(async () => (await state()).renders).toBeGreaterThan(before);
        await settled();
    }
    const beforeCamera = (await state()).camera;
    const canvas = page.locator('#viewer canvas');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 30, { steps: 5 });
    await page.mouse.up();
    const released = await state();
    await expect.poll(async () => (await state()).renders).toBeGreaterThan(released.renders);
    await settled();
    expect((await state()).camera).not.toEqual(beforeCamera);
    // Clear the sub-threshold OrbitControls damping tail before exact pixel comparison.
    await page.evaluate(() => window.referenceScene.liveEdit('restoreCameraState', window.referenceScene.liveState().camera));
    await settled();
    const beforeExport = await canvas.screenshot();
    await page.evaluate(() => window.referenceScene.liveEdit('renderToCanvas', 480, 270));
    await settled();
    expect((await canvas.screenshot()).equals(beforeExport)).toBe(true);
    const final = (await state()).renders;
    await page.waitForTimeout(250);
    expect((await state()).renders).toBe(final);
    expect(errors).toEqual([]);
});

test('rendering workload benchmark', async ({ page, browser }, info) => {
    test.skip(!process.env.SIM_BENCHMARK, 'Opt-in timing workload; not a timing gate');
    await page.goto('http://127.0.0.1:4174/WebDrawTabSim/visual/runner.html');
    await page.waitForFunction(() => !!window.referenceScene);
    const environment = await page.evaluate(() => window.referenceScene.metadata());
    const result = await page.evaluate(() => window.referenceScene.benchmark());
    const report = { environment, browser: browser.version(), cpu: os.cpus()[0].model,
        os: `${os.platform()} ${os.release()}`, ...result };
    console.log(JSON.stringify(report));
    await info.attach('benchmark', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    expect(result.exportMs).toBeGreaterThan(0);
});
