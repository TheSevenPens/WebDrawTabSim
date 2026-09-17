import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './visual/specs',
    workers: 1,
    retries: 0,
    timeout: 90_000,
    forbidOnly: !!process.env.CI,
    // A missing baseline must fail, not become accepted during a regular run.
    updateSnapshots: 'none',
    snapshotPathTemplate: '{testDir}/../baselines/{platform}/{arg}{ext}',
    reporter: [['list'], ['html', { open: 'never' }]],
    expect: {
        timeout: 15_000,
        toHaveScreenshot: { animations: 'disabled', threshold: 0.15, maxDiffPixelRatio: 0.002 },
        toMatchSnapshot: { threshold: 0.15, maxDiffPixelRatio: 0.002 },
    },
    use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 1,
        locale: 'en-US', timezoneId: 'UTC', colorScheme: 'light',
        reducedMotion: 'reduce',
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
        trace: 'retain-on-failure', screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'node node_modules/vite/bin/vite.js preview --outDir .visual-dist --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174/WebDrawTabSim/',
        reuseExistingServer: false,
    },
});
