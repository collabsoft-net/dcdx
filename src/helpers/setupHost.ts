import puppeteer from 'puppeteer';

import { SupportedApplications, TSupportedApplications } from '../types/Application';
import { DCDX } from '../types/Config';
import { ConfigureConfluence, ConfigureJira, TConfigureConfluence, TConfigureJira } from '../types/Configure';
import { capitalize } from './capitalize';

export const setupHost = async (name: TSupportedApplications, config: DCDX): Promise<boolean> => {
  const options = config.setup[name];
  if (!options) {
    throw new Error(`Could not find initial setup configuration for ${capitalize(name)}`);
  }

  switch (name) {
    case SupportedApplications.Values.jira:
      return setupJira(ConfigureJira.parse(options));
    case SupportedApplications.Values.confluence:
      return setupConfluence(ConfigureConfluence.parse(options));
    case SupportedApplications.Values.bitbucket:
      console.log('Oopsie daisy 🌼 Atlassian Bitbucket does not require additional setup 🤖');
      return true;
  }

  return true;
}

const setupJira = async (options: TConfigureJira): Promise<boolean> => {
  try {
    // Launch Google Chrome
    const browser = await puppeteer.launch();

    // Create the page view
    const page = await browser.newPage();
    await page.setViewport({width: 1080, height: 1024});

    // Open the Setup page
    console.log(`Starting automated initial setup of Atlassian Jira 🤖`);
    await page.goto(options.baseUrl, { waitUntil: ['domcontentloaded','load','networkidle0'], timeout: 5 * 60 * 1000 });

    // We need to make sure that progress has ended
    const isStillLoading = !! await page.$('#progress');
    if (isStillLoading) {
      console.log('Waiting for Atlassian Jira to be ready... ⏳')
      await page.waitForNavigation({ waitUntil: ['domcontentloaded', 'load', 'networkidle0'], timeout: 5 * 60 * 1000 })
    }

    // Set up application properties
    const mustSetupApplicationProperties = !! await page.$('form[action="SetupApplicationProperties.jspa"]');
    if (mustSetupApplicationProperties) {
      console.log('Setting up application properties');
      await page.locator('input[name=title]').fill(options.title);
      await page.locator(`label[for=jira-setupwizard-mode-${options.mode}]`).click();
      await page.locator('input[name=baseURL]').fill(options.baseUrl);
      await page.locator('#jira-setupwizard-submit').click();

      console.log('Waiting for the administrator account setup wizard to load... ⏳');
      await page.waitForSelector('form[action="SetupAdminAccount.jspa"]', { timeout: 5 * 60 * 1000 });
    }

    // Set up administrator account
    const mustSetupAdminAccount = !! await page.$('form[action="SetupAdminAccount.jspa"]');
    if (mustSetupAdminAccount) {
      console.log('Setting up the administrator account');
      await page.locator('input[name=fullname]').fill(options.fullname);
      await page.locator('input[name=email]').fill(options.email);
      await page.locator('input[name=username]').fill(options.username);
      await page.locator('input[name=password]').fill(options.password);
      await page.locator('input[name=confirm]').fill(options.password);
      await page.locator('#jira-setupwizard-submit').click();

      console.log('Waiting for the email notification setup wizard to load... ⏳');
      await page.waitForSelector('form[action="SetupMailNotifications.jspa"]', { timeout: 5 * 60 * 1000 });
    }

    // Set up email notifications
    const mustSetupEmailNotification = !! await page.$('form[action="SetupMailNotifications.jspa"]');
    if (mustSetupEmailNotification) {
      console.log('Setting up the email notification settings');
      const configureEmailNotifications = options.configureEmail === 'later' ? 'disabled' : 'enabled';
      await page.locator(`label[for=jira-setupwizard-email-notifications-${configureEmailNotifications}]`).click();
      await page.locator('#jira-setupwizard-submit').click();

      console.log('Waiting for the language chooser to load... ⏳');
      await page.waitForSelector('#choose-language-form', { timeout: 5 * 60 * 1000 });
    }

    // Welcome to Jira, Administrator!
    const mustSetupLanguage = !! await page.$('#choose-language-form');
    if (mustSetupLanguage) {
      console.log('Setting up the language for the administrator account');
      const languageSelector = !options.language || options.language === 'en-US' ? 'locale_-1' : `locale_${options.language}`;
      await page.locator(`label[for=${languageSelector}]`).click();
      await page.locator('#next').click();

      console.log('Waiting for the avatar setup wizard to load... ⏳');
      await page.waitForSelector('.onboarding-sequence-avatar-picker', { timeout: 5 * 60 * 1000 });
    }

    const mustSetupAvatar = !! await page.$('.onboarding-sequence-avatar-picker');
    if (mustSetupAvatar) {
      console.log('Setting up the avatar for the administrator account');
      await page.locator('input.avatar-picker-done').click();
      await page.waitForSelector('#onboarding', { timeout: 5 * 60 * 1000 });
    }

    // We're done here, let's wrap things up
    console.log(`Finished automated initial setup of Atlassian Jira 💪`);
    await page.close();
    await browser.close();

    return true;
  } catch (err) {
    console.error('Failed to automatically setup Atlassian Jira');
    console.log(err);
    return false;
  }
}

const setupConfluence = async (options: TConfigureConfluence): Promise<boolean> => {
  try {
    // Launch Google Chrome
    const browser = await puppeteer.launch();

    // Create the page view
    const page = await browser.newPage();
    await page.setViewport({width: 1080, height: 1024});

    // Open the Setup page
    console.log(`Starting automated initial setup of Atlassian Confluence 🤖`);
    await page.goto(options.baseUrl, { waitUntil: ['domcontentloaded','load','networkidle0'], timeout: 5 * 60 * 1000 });

    // Choose your deployment type
    const mustChooseDeploymentType = !! await page.$('form[action="setupcluster.action"]');
    if (mustChooseDeploymentType) {
      console.log('Setting up deployment type');
      const clusteringStatus = options.deploymentType === 'clustered' ? 'clusteringEnabled' : 'clusteringDisabled';
      await page.locator(`label[for=${clusteringStatus}]`).click();

      if (options.deploymentType === 'clustered') {
        // TODO: add cluster options
        await page.locator('button[name=newCluster]').click();
      } else {
        await page.locator('#skip-button').click();
      }

      console.log('Waiting for the content chooser page to load... ⏳');
      await page.waitForSelector('form[action="setupdata.action"]', { timeout: 5 * 60 * 1000 });
    }

    // Load Content
    const mustLoadContent = !! await page.$('form[action="setupdata.action"]');
    if (mustLoadContent) {
      if (options.loadContent === 'example') {
        await page.locator('#demoChoiceForm > input[type=submit]').click();
      } else {
        await page.locator('#blankChoiceForm > input[type=submit]').click();
      }

      console.log('Waiting for the user management configuration page to load... ⏳');
      await page.waitForSelector('form[action="setupusermanagementchoice.action"]', { timeout: 5 * 60 * 1000 });
    }

    // Configure User Management
    const mustConfigureUserManagement = !! await page.$('form[action="setupusermanagementchoice.action"]');
    if (mustConfigureUserManagement) {
      if (options.userManagement === 'confluence') {
        await page.locator('#internal').click();

        console.log('Waiting for the system administration account configuration page to load... ⏳');
        await page.waitForSelector('form[action="setupadministrator.action"]', { timeout: 5 * 60 * 1000 });
      } else {
        await page.locator('#jaacs').click();

        console.log('Waiting for the Connect to Jira page to load... ⏳');
        await page.waitForSelector('form[action="connecttojira.action"]', { timeout: 5 * 60 * 1000 });
      }
    }

    // Configure System Administrator Account
    const mustConfigureAdministratorAccount = !! await page.$('form[action="setupadministrator.action"]');
    if (mustConfigureAdministratorAccount) {
      console.log('Configuring the administrator account');
      await page.locator('input[name=username]').fill(options.username);
      await page.locator('input[name=fullName]').fill(options.fullName);
      await page.locator('input[name=email]').fill(options.email);
      await page.locator('input[name=password]').fill(options.password);
      await page.locator('input[name=confirm]').fill(options.password);
      await page.locator('#setup-next-button').click();

      console.log('Waiting for the setup successful notification to load... ⏳');
      await page.waitForSelector('a.finishAction', { timeout: 5 * 60 * 1000 });
    }

    const mustFinishSetup = !! await page.$('a.finishAction');
    if (mustFinishSetup) {
      console.log('Finalizing initial Confluence setup');
      await page.locator('a.finishAction').click();

      console.log('Waiting for the initial space creation form to load... ⏳');
      await page.waitForSelector('#grow-intro-create-space', { timeout: 5 * 60 * 1000 });
    }

    // We're done here, let's wrap things up
    console.log(`Finished automated initial setup of Atlassian Confluence 💪`);
    await page.close();
    await browser.close();

    return true;
  } catch (err) {
    console.error('Failed to automatically setup Atlassian Confluence');
    console.log(err);
    return false;
  }
}

