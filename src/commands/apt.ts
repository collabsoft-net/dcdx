#!/usr/bin/env node

import { Command as Commander, Option } from 'commander';
import { gracefulExit } from 'exit-hook';
import { join } from 'path';
import { cwd } from 'process';

import { generateDependencyTree } from '../apt/helpers/generateDependencyTree';
import { generatePerformanceReport } from '../apt/helpers/generatePerformanceReport';
import { generateScalabilityReport } from '../apt/helpers/generateScalabilityReport';
import { generateSCAReport } from '../apt/helpers/generateSCAReport';
import { getHostLicense } from '../apt/helpers/getHostLicense';
import { getOutputDirectory } from '../apt/helpers/getOutputDirectory';
import { getProduct } from '../apt/helpers/getProduct';
import { provisionCluster } from '../apt/helpers/provisionCluster';
import { restartCluster } from '../apt/helpers/restartCluster';
import { runLuceneTimingTest } from '../apt/helpers/runLuceneTimingTest';
import { runPerformanceTest } from '../apt/helpers/runPerformanceTest';
import { runScalabilityTest } from '../apt/helpers/runScalabilityTest';
import { teardownCluster } from '../apt/helpers/teardownCluster';
import { waitForUserInput } from '../apt/helpers/waitForUserInput';
import { emptyLine, generic, init, LuceneTimingTest, Run1, Run2, ScalabilityTestMessages } from '../apt/messages';
import { Performance } from '../apt/performance';
import { Scalability } from '../apt/scalability';
import { ActionHandler } from '../helpers/ActionHandler';
import { SupportedApplications } from '../types/Application';
import { PerformanceTestTypes, ReportTypes, TAPTArgs, TAPTDependencyTreeArgs, TAPTPerformanceReportArgs, TAPTPerformanceTestArgs, TAPTProvisionArgs, TAPTRestartArgs, TAPTSCAArgs, TAPTScalabilityReportArgs, TAPTScalabilityTestArgs, TAPTTeardownArgs } from '../types/DCAPT';

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
      archive: options.archive,
      appLicense: options.appLicense,
      restartAfterInstall: options.restartAfterInstall,
      timestamp: options.timestamp,
      force: options.force
    });

    // Ask permission to continue with the next step
    await waitForUserInput('Press a key to continue with the next step...', options.force);

    // Start the scalability testing
    await Scalability({
      product,
      cwd: options.cwd,
      outputDir: options.outputDir,
      environment: options.environment,
      appKey: options.appKey,
      archive: options.archive,
      appLicense: options.appLicense,
      restartAfterInstall: options.restartAfterInstall,
      timestamp: options.timestamp,
      force: options.force
    });

    // Ask permission to continue with the next step
    await waitForUserInput('Press a key to continue with the next step...', options.force);

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
  action: async (options: TAPTPerformanceReportArgs|TAPTScalabilityReportArgs) => {
    if (options.type === 'performance') {
      const ops = options as TAPTPerformanceReportArgs;
      if (!ops.resultsDir1) {
        throw new Error('The option `--resultsDir1` is required');
      } else if (!ops.resultsDir2) {
        throw new Error('The option `--resultsDir2` is required');
      }

      await generatePerformanceReport({
        ...ops,
        outputDir: getOutputDirectory(ops.outputDir, ops.timestamp)
      });
    } else {
      const ops = options as TAPTScalabilityReportArgs;
      await generateScalabilityReport({
        ...ops,
        product: ops.product,
        outputDir: getOutputDirectory(ops.outputDir, ops.timestamp)
      });
    }
  },
  errorHandler: async () => {
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
      archive: options.archive,
      appLicense: options.appLicense,
      restartAfterInstall: options.restartAfterInstall,
      timestamp: options.timestamp,
      force: options.force
    });

    // Ask permission to continue with the next step
    await waitForUserInput('Press a key to continue with the next step...', options.force);

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
})

const Run1Command = () => ({
  action: async (options: TAPTPerformanceTestArgs) => {
    await runPerformanceTest(PerformanceTestTypes.Values.baseline, {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: await getHostLicense(options.product, options.license, options.force)
    }, Run1);
  },
  errorHandler: async () => {

  }
})

const Run2Command = () => ({
  action: async (options: TAPTPerformanceTestArgs) => {
    await runPerformanceTest(PerformanceTestTypes.Values.regression, {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: await getHostLicense(options.product, options.license, options.force)
    }, Run2);
  },
  errorHandler: async () => {

  }
})

const ReindexCommand = () => ({
  action: async (options: TAPTPerformanceTestArgs) => {
    await runLuceneTimingTest(PerformanceTestTypes.Values.regression, {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: await getHostLicense(options.product, options.license, options.force)
    }, LuceneTimingTest);
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
      archive: options.archive,
      appLicense: options.appLicense,
      restartAfterInstall: options.restartAfterInstall,
      locust: options.locust,
      timestamp: options.timestamp,
      force: options.force
    });

    // Ask permission to continue with the next step
    await waitForUserInput('Press a key to continue with the next step...', options.force);

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
})

const Run3Command = () => ({
  action: async (options: TAPTScalabilityTestArgs) => {
    await runScalabilityTest('one-node', {
      ...options,
      outputDir: getOutputDirectory(options.outputDir, options.timestamp),
      license: await getHostLicense(options.product, options.license, options.force)
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
      license: await getHostLicense(options.product, options.license, options.force)
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
      license: await getHostLicense(options.product, options.license, options.force)
    }, ScalabilityTestMessages);
  },
  errorHandler: async () => {

  }
})

const ProvisionCommand = () => ({
  action: async (options: TAPTProvisionArgs) => {
    await provisionCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      license: options.license,
      nodes: options.nodes,
      force: options.force
    }, options.cwd === undefined);
  },
  errorHandler: async () => {

  }
})

const RestartCommand = () => ({
  action: async (options: TAPTRestartArgs) => {
    await restartCluster({
      product: options.product,
      cwd: options.cwd,
      environment: options.environment,
      force: options.force
    });
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

const DependencyTreeCommand = () => ({
  action: async (options: TAPTDependencyTreeArgs) => {
    await generateDependencyTree({
      appKey: options.appKey,
      archive: options.archive,
      activateProfiles: options.activateProfiles,
      outputFile: options.outputFile || join(cwd(), 'maven_dependency_tree.gv')
    });
  },
  errorHandler: async () => {

  }
})

const SCACommand = () => ({
  action: async (options: TAPTSCAArgs) => {
    await generateSCAReport({
      nvdApiKey: options.nvdApiKey,
      appKey: options.appKey,
      archive: options.archive,
      dataDir: options.dataDir,
      outputDir: options.outputDir || join(cwd(), 'sca_report')
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
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, DefaultCommand(), options));

program
  .command('provision')
  .description('Provision the Data Center App Performance Testing cluster on AWS')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--nodes <number>', 'The number of nodes for the cluster').default(1))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit'))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ProvisionCommand(), options));

program
  .command('performance')
  .description('Run the Data Center App Performance Toolkit performance regression test')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
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
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('--locust', 'Use locust load executor (instead of JMeter)').default(false))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ScalabilityTestCommand(), options));

program
  .command('reindex')
  .description('Run the Data Center App Performance Toolkit Lucene Index Timing test')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ReindexCommand(), options));

program
  .command('report')
  .description('Generate a Data Center App Performance Testing report')
  .addOption(new Option('--type <type>', 'The type of report to generate').choices(Object.values(ReportTypes.Values)).makeOptionMandatory(true))
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)))
  .addOption(new Option('--resultsDir1 <directory>', 'Specify the directory where to find the results of the 1st run used to generate the report'))
  .addOption(new Option('--resultsDir2 <directory>', 'Specify the directory where to find the results of run 2nd run used to generate the report'))
  .addOption(new Option('--resultsDir3 <directory>', 'Specify the directory where to find the results of run 3rd run used to generate the report (only for Scalability report)'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution').makeOptionMandatory(true))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()).makeOptionMandatory(true))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, ReportCommand(), options));

program
  .command('run1')
  .description('Start the Data Center App Performance Testing Performance baseline test (run 1)')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run1Command(), options));

program
  .command('run2')
  .description('Start the Data Center App Performance Testing Performance regression test (run 2)')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run2Command(), options));

program
  .command('run3')
  .description('Start the Data Center App Performance Testing Scalability test on a one-node DC cluster (run 3)')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run3Command(), options));

program
  .command('run4')
  .description('Start the Data Center App Performance Testing Scalability test on a two-node DC cluster (run 4)')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run4Command(), options));

program
  .command('run5')
  .description('Start the Data Center App Performance Testing Scalability test on a four-node DC cluster (run 5)')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--license <path_or_license>', 'The host product license, either as a path to a file or the license itself'))
  .addOption(new Option('--ts, --timestamp <timestamp>', 'The timestamp of the test run, which can be used to continue an existing test execution'))
  .addOption(new Option('--appKey <appKey>', 'The key of the app (for automated installation)'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive (for automated installation)'))
  .addOption(new Option('--restartAfterInstall', 'Restart the container after installing the app').default(false))
  .addOption(new Option('-O, --outputDir <directory>', 'Specify the directory where to store the results of the App Performance Toolkit'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, Run5Command(), options));

program
  .command('restart')
  .description('Restart the Data Center App Performance Testing cluster on AWS')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, RestartCommand(), options));

program
  .command('teardown')
  .description('Terminate the Data Center App Performance Testing cluster on AWS')
  .addOption(new Option('--product <name>', 'The host product').choices(Object.values(SupportedApplications.Values)).makeOptionMandatory(true))
  .addOption(new Option('--environment <name>', 'The environment name'))
  .addOption(new Option('--cwd <directory>', 'Specify the working directory where to find the App Performance Toolkit').default(cwd()))
  .addOption(new Option('-y, --force', 'Use default values for input questions when available').default(false))
  .action(options => ActionHandler(program, TeardownCommand(), options));

program
  .command('dependencies')
  .description('Generate the Data Center App Performance Testing dependency tree')
  .addOption(new Option('--appKey <appKey>', 'The key of the app to graph dependencies for'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive to graph dependencies for'))
  .addOption(new Option('-P, --activate-profiles <arg>', 'Comma-delimited list of profiles to activate'))
  .addOption(new Option('-O, --outputFile <path>', 'Specify the output file where to store the generated dependency tree (defaults to `./maven_dependency_tree.gv`)'))
  .action(options => ActionHandler(program, DependencyTreeCommand(), options));

program
  .command('sca')
  .description(`Run the Data Center App Performance Testing software composition analysis (SCA) tool

To avoid rate limiting issues, providing an NVD API Key is required (see https://nvd.nist.gov/developers/request-an-api-key)
`)
  .addOption(new Option('--nvdApiKey <key>', 'The NVD API key (defaults to NVD_API_KEY environment variable)').default(process.env.NVD_API_KEY))
  .addOption(new Option('--appKey <appKey>', 'The key of the app to scan'))
  .addOption(new Option('--archive <path>', 'The path to the JAR/OBR archive to scan'))
  .addOption(new Option('-D, --dataDir <path>', 'The path to the directory that contains the NVD database'))
  .addOption(new Option('-O, --outputDir <path>', 'Specify the output directory where to store the generated report (defaults to `./sca_report`)'))
  .action(options => ActionHandler(program, SCACommand(), options));

program.parseAsync(process.argv).catch(() => gracefulExit(1));

process.on('SIGINT', () => {
  console.log(`Received term signal, trying to stop gracefully 💪`);
  gracefulExit();
});
