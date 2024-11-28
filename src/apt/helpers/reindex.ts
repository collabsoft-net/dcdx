import { confirm } from '@inquirer/prompts';
import axios from 'axios';
import { Presets, SingleBar } from 'cli-progress';
import fkill from 'fkill';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import puppeteer from 'puppeteer';

import { getReindexProgress } from './getReindexProgress';
import { waitForUserInput } from './waitForUserInput';

const progressBar = new SingleBar({
  format: '  Lucene re-index [{bar}] {percentage}% | ETA: {remaining}m',
  hideCursor: true
}, Presets.legacy);


export const reindex = async (baseUrl: string, outputDir: string, force?: boolean) => {

  // Check if the reindex screenshot already exists
  if (existsSync(join(outputDir, 'lucene-reindex.png'))) {

    // Ask nicely if we need to remove the existing test results
    const overwriteExistingResults = force || await confirm({
      message: 'There are existing reindex results, do you want to overwrite these results?'
    });

    // If we need to overwrite the test results, we should do so
    if (overwriteExistingResults) {
      console.log('Removing existing reindex results');
      rmSync(join(outputDir, 'lucene-reindex.png'), { force: true });

    // If we are not allowed to overwrite the test results, there is no point in running this test
    } else {
      console.log(`Skipping Lucene Index Timing test execution, a successful test run was already completed`);
      return;
    }

  }

  // Ask nicely if we can start
  const { value } = await waitForUserInput(`Press any key to start the Lucense Index Timing test...
  (or 's' to skip if the test is already running)
`, force);

  // Check if they agreed to starting the reindex
  if (value !== 's') {

    // They did! So let's start it using the Jira REST API
    const response = await axios.post(`${baseUrl}/rest/api/2/reindex?type=FOREGROUND`, undefined, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`admin:admin`).toString('base64')}`
      }
    }).catch(() => null);

    // Let's make sure that we got a proper response
    if (response === null || response.status !== 202) {

      // Oh no, something went wrong
      // No reindex is no successful test, so we should throw a hissy fit
      throw new Error('Failed to start Lucense Index Timing test, could not perform reindex');

    }
  }

  // Start the clock!
  const startTime = new Date().getTime();

  // Start the progress bar to count for 60 minutes
  progressBar.start(3600, 0, { remaining: 60 });

  // Placeholder indicating whether the reindex is finished
  let isFinished: boolean = false;

  // We are going to try to get an update from Jira
  while (!isFinished) {

    // Get an update from the server
    const [ progressUrl, success, finished ] = await getReindexProgress(baseUrl);

    // Check if the reindex has finished
    if (!finished) {

      // Check if we are still within the 60 minute window
      if (progressBar.getProgress() < progressBar.getTotal()) {

        // We are, so let's just increment the progress bar and try again
        progressBar.increment(60, {
          remaining: 60 - Math.floor((((new Date().getTime() - startTime) / 1000) / 60))
        });

        // Wait for 1 minute until we retry
        await new Promise<void>(resolve => setTimeout(resolve, 1 * 60 * 1000));

      // We are no longer in the 60 minute window, manual action is required
      // when operating in non-interactive mode
      } else if (!force) {

        // Stop the progress bar
        progressBar.stop();

        // Tell the user that they need to do something
        console.log(`
  Lucense re-index is taking a long time to finish. Please go to the following URL
  ${baseUrl}${progressUrl || '/secure/admin/jira/IndexProgress.jspa'}

  and manually confirm that the re-index has completed successfully
`);

      // Ask the user to confirm the reindex has completed successfully
      isFinished = await confirm({ message: 'Has the reindex completed succesfully?' });

      // If we are in non-interactive mode, we have no choice
      } else {

        // The only option left is to throw a hissy fit
        throw new Error('Re-index has not completed within 60 minutes, test has failed');

      }

    // Check if we have finished successfully
    } else if (!success) {

      // Stop the progress bar
      progressBar.stop();

      // Tell the user that something has gone completely wrong
      console.log(`
  Lucense re-index finished unsuccesfully. Please go to the following URL for more information:
  ${baseUrl}${progressUrl || '/secure/admin/jira/IndexProgress.jspa'}
`)

      // Now throw a hissy fit anyway
      throw new Error('Lucence Index Timing test failed');
    }

    // Update the loop variable
    isFinished = finished;
  }

  // Get the latest update on the reindex progress
  const [ progressUrl ] = await getReindexProgress(baseUrl);

  // Check if we have a progress URL
  if (!progressUrl) {

    // If we don't have a progress URL, something went wrong and we should throw a hissy fit
    throw new Error('Could not find the latest Lucence Index Timing test results');

  }

  // Retry counter
  let retryCount = 0;

  // Placeholder indicating whether the screenshot was successfully created
  let screenshotCreated = false;

  // Loop until we've made a screen shot or tried it 5 times (incl. one time manually)
  while (!screenshotCreated && retryCount < 5) {
    try {

      // If the retry count is 4, this means this is our last rodeo
      if (retryCount === 4) {

        // Check if we are in non-interactive mode
        if (force) {

          // The last step is manual, which we can't do in non-interactive mode
          // so our only option left is to throw a hissy fit
          throw new Error('Failed to automatically capture a screen shot of the Lucene Reindex');

        }

        // Tell the user they have to do something
        console.log(`
  We've tried to automatically create a screenshot, but the process seems to be stuck

  We will now open a browser window for you to follow the automated steps and intervene
  where possible (for instance, by pressing a button or reloading a screen)
`)

        // Now ask them nicely if they are ready
        await waitForUserInput('Press a key to open the browser window...');
      }

      // Start the browser session
      const browser = await puppeteer.launch({ headless: (!force && retryCount < 4) });
      try {
        const page = await browser.newPage();
        await page.setViewport({width: 1080, height: 1024});

        // Open the reindex progress page
        await page.goto(`${baseUrl}${progressUrl}`);

        // Log in
        await page.locator('#login-form-username').fill('admin');
        await page.locator('#login-form-password').fill('admin');
        await page.locator('#login-form-submit').click();

        // Websudo
        await page.locator('#login-form-authenticatePassword').fill('admin');
        await page.locator('#login-form-submit').click();

        // XSRF token expiration snafu
        await page.locator('#atl_token_retry_button').click().catch(() => null);

        // Make sure that we are on the reindex page and that it is loaded
        await page.waitForSelector('#acknowledge_submit');

        // Make the screen shot
        await page.screenshot({
          path: join(outputDir, 'lucene-reindex.png')
        });

        // Make sure that we have captured the screen shot in the output directory
        screenshotCreated = existsSync(join(outputDir, 'lucene-reindex.png'));
      } catch (err) {
        console.log(err);
        console.log(`  Could not get a screen shot of the lucene indexing result, retrying...`);
      } finally {
        // Close the browser window
        await browser.close();
        // No I mean, really close it
        await fkill('Chrome').catch(() => null);
        await fkill('chrome').catch(() => null);
        await fkill('Chromium').catch(() => null);
        await fkill('chromium').catch(() => null);
      }

    } catch (err) {
      console.log(err);
      console.log(`  Could not get a screen shot of the lucene indexing result, retrying...`);
    } finally {
      retryCount++;
    }
  }

  // If we could not create the screenshot, throw a hissy fit!
  if (!screenshotCreated) {
    throw new Error('Failed to capture the lucene indexing results');
  }

  // Otherwise we should show a happy message
  console.log(`
  ✔ Lucence Index Timing test foreground indexing of Jira has completed`);

}