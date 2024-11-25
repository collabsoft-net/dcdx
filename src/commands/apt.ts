#!/usr/bin/env node

import { Command as Commander, Option } from 'commander';
import { gracefulExit } from 'exit-hook';
import { cwd } from 'process';

import { generatePerformanceReport } from '../apt/helpers/generatePerformanceReport';
import { generateScalabilityReport } from '../apt/helpers/generateScalabilityReport';
import { getOutputDirectory } from '../apt/helpers/getOutputDirectory';
import { getProduct } from '../apt/helpers/getProduct';
import { provisionCluster } from '../apt/helpers/provisionCluster';
import { runPerformanceTest } from '../apt/helpers/runPerformanceTest';
import { runScalabilityTest } from '../apt/helpers/runScalabilityTest';
import { teardownCluster } from '../apt/helpers/teardownCluster';
import { waitForUserInput } from '../apt/helpers/waitForUserInput';
import { emptyLine, generic, init, Run1, Run2, ScalabilityTestMessages } from '../apt/messages';
import { Performance } from '../apt/performance';
import { Scalability } from '../apt/scalability';
import { ActionHandler } from '../helpers/ActionHandler';
import { timebomb } from '../helpers/licences';
import { SupportedApplications } from '../types/Application';
import { ReportTypes, TAPTArgs, TAPTPerformanceTestArgs, TAPTReportArgs, TAPTScalabilityTestArgs, TAPTTeardownArgs } from '../types/DCAPT';

const program = new Commander();

const DefaultCommand = () => ({
  action: async (options: TAPTArgs) => {

    // Clear the console and show a welcome message
    process.stdout.write('\x1Bc')
    console.log(generic.header);

    // Get the product from the args or ask for it nicely
    const product = options.product || await getProduct();

    // Show the init message
    console.log(init.header(product));

    // Ask for the user to confirm they are ready
    await waitForUserInput('Press a key to start with the first step...', options.force);
    emptyLine();

    // Start the performance testing
    await Performance({
      product: product,
      cwd: options.cwd,
      outputDir: options.outputDir,
      environment: options.environment,
      appKey: options.appKey,
      appLicense: options.appLicense,
      timestamp: options.timestamp,
      force: options.force
    });

    // Start the scalability testing
    await Scalability({
      product,
      cwd: options.cwd,
      outputDir: options.outputDir,
      environment: options.environment,
      appKey: options.appKey,
      appLicense: options.appLicense,
      timestamp: options.timestamp,
      force: options.force
    });

    // Teardown the cluster
    await teardownCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      force: options.force
    });
  },
  errorHandler: async () => {

  }
});

const ReportCommand = () => ({
  action: async (options: TAPTReportArgs) => {
    if (options.type === 'performance') {
      await generatePerformanceReport({
        ...options,
        outputDir: getOutputDirectory(options.outputDir, options.timestamp)
      });
    } else {
      await generateScalabilityReport({
        ...options,
        outputDir: getOutputDirectory(options.outputDir, options.timestamp)
      });
    }
  },
  errorHandler: async () => {
    // TODO improve error handling
    console.log('Something went wrong');
  }
})

const PerformanceTestCommand = () => ({
  action: async (options: TAPTPerformanceTestArgs) => {
    // Start the performance testing
    await Performance({
      product: options.product,
      cwd: options.cwd,
      outputDir: options.outputDir,
      environment: options.environment,
      appKey: options.appKey,
      appLicense: options.appLicense,
      timestamp: options.timestamp,
      force: options.force
    });

    // Teardown the cluster
    await teardownCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      force: options.force
    });
  },
  errorHandler: async () => {
    // TODO improve error handling
    console.log('Something went wrong');
  }
})

const Run1Command = () => ({
  action: async (options: TAPTPerformanceTestArgs) => {
    await runPerformanceTest('baseline', {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: timebomb[options.product]
    }, Run1);
  },
  errorHandler: async () => {

  }
})

const Run2Command = () => ({
  action: async (options: TAPTPerformanceTestArgs) => {
    await runPerformanceTest('regression', {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: timebomb[options.product]
    }, Run2);
  },
  errorHandler: async () => {

  }
})

const ScalabilityTestCommand = () => ({
  action: async (options: TAPTScalabilityTestArgs) => {
    // Start the scalability testing
    await Scalability({
      product: options.product,
      cwd: options.cwd,
      outputDir: options.outputDir,
      environment: options.environment,
      appKey: options.appKey,
      appLicense: options.appLicense,
      timestamp: options.timestamp,
      force: options.force
    });

    // Teardown the cluster
    await teardownCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      force: options.force
    });
  },
  errorHandler: async () => {
    // TODO improve error handling
    console.log('Something went wrong');
  }
})

const Run3Command = () => ({
  action: async (options: TAPTScalabilityTestArgs) => {
    await runScalabilityTest('one-node', {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: timebomb[options.product],
    }, ScalabilityTestMessages);
  },
  errorHandler: async () => {

  }
})

const Run4Command = () => ({
  action: async (options: TAPTScalabilityTestArgs) => {
    await runScalabilityTest('two-node', {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: timebomb[options.product],
    }, ScalabilityTestMessages);
  },
  errorHandler: async () => {

  }
})

const Run5Command = () => ({
  action: async (options: TAPTScalabilityTestArgs) => {
    await runScalabilityTest('four-node', {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: timebomb[options.product],
    }, ScalabilityTestMessages);
  },
  errorHandler: async () => {

  }
})

const ProvisionCommand = () => ({
  action: async (options: TAPTTeardownArgs) => {
    await provisionCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      force: options.force
    }, true);
  },
  errorHandler: async () => {

  }
})

const TeardownCommand = () => ({
  action: async (options: TAPTTeardownArgs) => {
    await teardownCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      force: options.force
    });
  },
  errorHandler: async () => {

  }
})


program
  .name('dcdx apt')
  .showHelpAfterError(true);

program
  .command('default', { isDefault: true, hidden: true })
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, DefaultCommand(), options));

program
  .command('performance')
  .description('Run the Data Center App Performance Toolkit performance regression test')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, PerformanceTestCommand(), options));

program
  .command('scalability')
  .description('Run the Data Center App Performance Toolkit scalability test')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ScalabilityTestCommand(), options));

program
  .command('report')
  .description('Generate a Data Center App Performance Testing report')
  .addOption(new Option('--type <type>', 'The type of report to generate').choices(Object.values(ReportTypes.Values)).makeOptionMandatory(true))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution').makeOptionMandatory(true))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()).makeOptionMandatory(true))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ReportCommand(), options));

program
  .command('run1')
  .description('Start the Data Center App Performance Testing Performance Regression test (run 1)')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run1Command(), options));

program
  .command('run2')
  .description('Continue the Data Center App Performance Testing with run 2')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run2Command(), options));

program
  .command('run3')
  .description('Continue the Data Center App Performance Testing with run 3')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run3Command(), options));

program
  .command('run4')
  .description('Continue the Data Center App Performance Testing with run 4')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run4Command(), options));

program
  .command('run5')
  .description('Continue the Data Center App Performance Testing with run 5')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run5Command(), options));

program
  .command('provision')
  .description('Provision the Data Center App Performance Testing cluster on AWS')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ProvisionCommand(), options));

program
  .command('teardown')
  .description('Terminate the Data Center App Performance Testing cluster on AWS')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, TeardownCommand(), options));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
