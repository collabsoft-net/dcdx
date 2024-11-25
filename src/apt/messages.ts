import { join } from 'path'

import { capitalize } from '../helpers/capitalize'
import { TSupportedApplications } from '../types/Application'
import { TAPTPerformanceTestMessages, TAPTScalabilityTestMessages, TScalabilityTestTypes, TTestResults } from '../types/DCAPT'
import { getRunForStage } from './helpers/getRunForStage'

const toNumber = (stage: TScalabilityTestTypes) => {
  switch (stage) {
    case 'one-node': return 'third';
    case 'two-node': return 'fourth';
    case 'four-node': return 'fifth';
  }
}

export const emptyLine = () => console.log('​');

export const generic = {
  header: `
                          ____      _          _____         _                                  
                          |    \\ ___| |_ ___   |     |___ ___| |_ ___ ___                        
                          |  |  | .'|  _| .'|  |   --| -_|   |  _| -_|  _|                       
                          |____/|__,|_| |__,|  |_____|___|_|_|_| |___|_|                         
                                                                                                
                                                                                                
  _____            _____         ___                                  _____         _ _   _ _   
  |  _  |___ ___   |  _  |___ ___|  _|___ ___ _____ ___ ___ ___ ___   |_   _|___ ___| | |_|_| |_ 
  |     | . | . |  |   __| -_|  _|  _| . |  _|     | .'|   |  _| -_|    | | | . | . | | '_| |  _|
  |__|__|  _|  _|  |__|  |___|_| |_| |___|_| |_|_|_|__,|_|_|___|___|    |_| |___|___|_|_,_|_|_|  
        |_| |_|                                                                                        

  Welcome to the automated Data Center App Performance Toolkit (DCAPT).
  This will guide you through all the steps to produce the required performance testing results
  for your (annual) Data Center approval.
`
}

export const init = {

  header: (product: TSupportedApplications) => `
  We will now follow all the steps as documented in the Data Center App Performance Toolkit User Guide For ${capitalize(product)}.
  Please consult the documentation prior to starting the test run:

  https://developer.atlassian.com/platform/marketplace/dc-apps-performance-toolkit-user-guide-${product}/

  Once you start the test run we will provision the environment on AWS. 
  IMPORTANT: This can incur costs.
  
  You can stop this process at any time by exiting this program. Be sure to run the following command to reset 
  the AWS environment and prevent unexpected costs.

  $ dcdx apt teardown

  You can also resume/restart every part of the test run using one of the following commands:

  $ dcdx apt init --product ${product}
  $ dcdx apt provision --product ${product}
  $ dcdx apt run1 --product ${product}
  $ dcdx apt run2 --product ${product}
  $ dcdx apt run3 --product ${product}
  $ dcdx apt run4 --product ${product}
  $ dcdx apt run5 --product ${product}

  We will continue with the following steps:
${product === 'jira' ? `
  1.  Provision the environment
  2.  Performance regression without app installed (run 1)
  3.  Lucene Index timing test with app installed (run 2)
  4.  Performance regression with app installed (run 2)
  5.  Scalability testing on one-node cluster with app-specific actions (run 3)
  6.  Scalability testing on two-node cluster with app-specific actions (run 4)
  7.  Scalability testing on four-node cluster with app-specific actions (run 5)
  8.  Generate reports
  9.  Teardown of environment
  10. Security Scanner for Data Center apps
` : `
  1. Provision the environment
  2. Performance regression without app installed (run 1)
  3. Performance regression with app installed (run 2)
  4. Scalability testing on one-node cluster with app-specific actions (run 3)
  5. Scalability testing on two-node cluster with app-specific actions (run 4)
  6. Scalability testing on four-node cluster with app-specific actions (run 5)
  7. Generate reports
  8. Teardown of environment
  9. Security Scanner for Data Center apps
`}`,

}

export const provisioning = {

  header: `
  _____ _____ _____ _____ _____ _____ _____ _____ _____ _____ _____ _____ 
  |  _  | __  |     |  |  |     |   __|     |     |   | |     |   | |   __|
  |   __|    -|  |  |  |  |-   -|__   |-   -|  |  | | | |-   -| | | |  |  |
  |__|  |__|__|_____|\\___/|_____|_____|_____|_____|_|___|_____|_|___|_____|
                                                                               
  We will now start provisioning AWS using the Atlassian Data Center App Performace Toolkit (DCAPT) Terraform configuration.

  In order to do this, we need the following information:

  1. The location of the Data Center App Performance Toolkit on your disk
  2. AWS credentials
  3. Product license
`,

  askForAWSCredentials: (product: TSupportedApplications) => `
  In order to provision the ${capitalize(product)} cluster, we need Administrator credentials for AWS.
  Please refer to the DCAPT documentation to find more information on how to create the AWS access keys:

  https://developer.atlassian.com/platform/marketplace/dc-apps-performance-toolkit-user-guide-${product}/#setup-${product}-data-center-development-environment-on-k8s-
`,

  askForEnvironment: `
  When provisioning the cluster, we need a unique environment name.
  This will allow you to create multiple clusters (i.e. for different host products) and to identify which cluster to use during testing & teardown.
`,

  askForLicense: `
  The host product requires a valid license.

  By default we use the 72h developer license provided by Atlassian. If you need a more extensive license,
  you can generate an evaluation license from my.atlassian.com or ask Atlassian Marketplace Developer Support for a test license.
`,

  ready: `
  We have now gathered all the information required to provision the cluster.

  !! IMPORTANT !!
  
  We will be writing the configuration to disk. This will overwrite existing configuration.
  Please note that provisioning the environment will incur AWS usage costs.
`,

  awsCredentialsPersisted: '✔ AWS credentials written to app/util/k8s/aws_envs',
  terraformConfigurationPersisted: `✔ Terraform configuration written to app/util/k8s/dcapt.tfvars`

}

export const Run1: TAPTPerformanceTestMessages = {

  header: () => `
  _____ _____ _____    ___   
  | __  |  |  |   | |  |_  |  
  |    -|  |  | | | |   _| |_ 
  |__|__|_____|_|___|  |_____|

  We will now start the performance regression testing without app installed (run 1)
  This will produce the performance baseline results.

  It is important that you are running the baseline test on the default configuration.
  You can get the default configuration from the APT sources:

  https://github.com/atlassian/dc-app-performance-toolkit
`,

  readyForProvisioning: `
In order to be able to start the performance regression test, we will now configure the DC cluster on AWS

!! IMPORTANT !!

We will be writing the configuration to disk. This will overwrite existing configuration.
Please note that provisioning the environment will incur AWS usage costs.
`,

  startPerformanceTest: `
We will now start the Performance Regression test
`,

  success: `
✔ Finished the performance regression testing without app installed (run 1)
`,

  failure: (cwd: string, product: TSupportedApplications, environment: string, resultsBaseDir: string, results: Partial<Record<TTestResults, string|undefined>>) => {
    let output = `
  ✔ Finished the performance regression testing without app installed (run 1)

  Unfortunately, the test run was finished unsuccesful. 
  Please review the test results and adjust the configuration if required.
`;

    Object.entries(results).forEach(([ key, value ]) => output += `  ${key}: ${value}\n`);

    output += `
  Full report can be found here:
  ${join(resultsBaseDir, 'results_summary.log')}

  You can restart the performance testing using the following command:
  
  $ dcdx apt run1 --product ${product} --cwd ${cwd} --environment ${environment}
`;

    return output
  }
}

export const Run2: TAPTPerformanceTestMessages = {

  header: (product: TSupportedApplications) => `
  _____ _____ _____    ___ 
  | __  |  |  |   | |  |_  |
  |    -|  |  | | | |  |  _|
  |__|__|_____|_|___|  |___|
                          
  We will now start the performance regression testing with app installed (run 2)
  This will allow the generation of a performance regression report.
${ product === 'jira' ? `
  In addition, a Lucene Index Timing Test is also part of the performance regression tests.` : ''}
  The second run consists of the following steps:
${ product === 'jira' ? `
  1. Install the app into the cluster
  2. Benchmark the re-index time with your app installed
  3. Performance results generation with the app installed
` : `
  1. Install the app into the cluster
  2. Performance results generation with the app installed
`}
  It is important that you are running the performance regression test on the default configuration.
  You can get the default configuration from the APT sources:

  https://github.com/atlassian/dc-app-performance-toolkit
`,

  readyForProvisioning: `
In order to be able to start the performance regression test, we will now configure the DC cluster on AWS

!! IMPORTANT !!

We will be writing the configuration to disk. This will overwrite existing configuration.
Please note that provisioning the environment will incur AWS usage costs.
`,

  startLuceneIndexing: `
  Now that the app is installed, we can start the Lucene Index timing test
  Once the test is finished, a browser window is opened to capture the test results. 

  !! IMPORTANT !!

  This may take ~50 minutes. Please do not terminate the program
  Do not close the browser window, or else the test will fail
`,

  startPerformanceTest: `
  We will now start the Performance Regression test
`,

success: `
✔ Finished the performance regression testing with app installed (run 2)
`,

  failure: (cwd: string, product: TSupportedApplications, environment: string, resultsBaseDir: string, results: Partial<Record<TTestResults, string|undefined>>) => {
    let output = `
  ✔ Finished the performance regression testing with app installed (run 2)

  Unfortunately, the test run was finished unsuccesful. 
  Please review the test results and adjust the configuration if required.
`;

    Object.entries(results).forEach(([ key, value ]) => output += `  ${key}: ${value}\n`);

    output += `
  Full report can be found here:
  ${join(resultsBaseDir, 'results_summary.log')}

  You can restart the performance testing using the following command:
  
  $ dcdx apt run2 --product ${product} --cwd ${cwd} --environment ${environment}
`;

    return output
  }


}

export const PerformanceReportMessages = {

  header: `
  _____ _____ _____ _____ _____ _____ _____ _____ _____ _____ _____   
  |  _  |   __| __  |   __|     | __  |     |  _  |   | |     |   __|  
  |   __|   __|    -|   __|  |  |    -| | | |     | | | |   --|   __|  
  |__|  |_____|__|__|__|  |_____|__|__|_|_|_|__|__|_|___|_____|_____|  
                                                                      
      _____ _____ _____ _____ _____ _____ _____ _____ _____ _____     
      | __  |   __|   __| __  |   __|   __|   __|     |     |   | |    
      |    -|   __|  |  |    -|   __|__   |__   |-   -|  |  | | | |    
      |__|__|_____|_____|__|__|_____|_____|_____|_____|_____|_|___|    
                                                                      
              _____ _____ _____ _____ _____ _____                     
              | __  |   __|  _  |     | __  |_   _|                    
              |    -|   __|   __|  |  |    -| | |                      
              |__|__|_____|__|  |_____|__|__| |_|                      


  We are going to generate the performance regression report
  The report constists of a CSV and PNG file that are required for 
  the (annual) Data Center app review
`

}

export const ScalabilityTestMessages: TAPTScalabilityTestMessages = {

  header: (product: TSupportedApplications, stage: TScalabilityTestTypes) => `
${stage === 'one-node' ? `
  _____ _____ _____    ___ 
  | __  |  |  |   | |  |_  |
  |    -|  |  | | | |  |_  |
  |__|__|_____|_|___|  |___|
` : stage === 'two-node' ? `
  _____ _____ _____    ___ 
  | __  |  |  |   | |  | | |
  |    -|  |  | | | |  |_  |
  |__|__|_____|_|___|    |_|                          
` : `
  _____ _____ _____    ___ 
  | __  |  |  |   | |  |  _|
  |    -|  |  | | | |  |_  |
  |__|__|_____|_|___|  |___|                          
`}

  We will now start the scalability benchmark for ${stage} ${capitalize(product)} DC cluster with app-specific actions: (run ${getRunForStage(stage)})

  The ${toNumber(stage)} run consists of the following steps:
  1. Adjust the environment to a ${stage} cluster
  1. Install the app into the cluster
  3. Scalability benchmark testing with the app installed

  It is important that you are running the scalability benchmark test on a DCAPT version that has app-specific actions
  More information on developing app-specific actions can be found here:

${ product === 'jira' ?
  `  https://developer.atlassian.com/platform/marketplace/dc-apps-performance-toolkit-user-guide-jira/#3--develop-and-test-app-specific-action-locally`
: product === 'confluence' ?
  `  https://developer.atlassian.com/platform/marketplace/dc-apps-performance-toolkit-user-guide-confluence/#3--develop-and-test-app-specific-actions-locally`
: product === 'bamboo' ?
  '  https://developer.atlassian.com/platform/marketplace/dc-apps-performance-toolkit-user-guide-bamboo/#2--app-specific-actions-development'
// product === 'bitbucket'
: '  https://developer.atlassian.com/platform/marketplace/dc-apps-performance-toolkit-user-guide-bitbucket/#3--develop-and-test-app-specific-action-locally'
}
`,

  readyForProvisioning: `
  In order to be able to start the scalability benchmark, we will now reconfigure the DC cluster on AWS

  !! IMPORTANT !!
  
  We will be writing the configuration to disk. This will overwrite existing configuration.
  Please note that provisioning the environment will incur AWS usage costs.
`,

  startScalabilityTest: `
  Ready to start the scalability benchmark test with app-specific actions
`,

success: `
✔ Finished the scalability benchmark test with app-specific actions
`,

  failure: (stage: TScalabilityTestTypes, cwd: string, product: TSupportedApplications, environment: string, resultsBaseDir: string, results: Partial<Record<TTestResults, string|undefined>>) => {
    let output = `
✔ Finished the scalability benchmark test with app-specific actions

  Unfortunately, the test run was finished unsuccesful. 
  Please review the test results and adjust the configuration if required.
`;

    Object.entries(results).forEach(([ key, value ]) => output += `  ${key}: ${value}\n`);

    output += `
  Full report can be found here:
  ${join(resultsBaseDir, 'results_summary.log')}

  You can restart the scalability benchmark test using the following command:
  
  $ dcdx apt run${getRunForStage(stage)} --product ${product} --cwd ${cwd} --environment ${environment}
`;

    return output
  }

}

export const ScalabilityReportMessages = {
  header: `
  _____ _____ _____ __    _____ _____ _____ __    _____ _____ __ __ 
  |   __|     |  _  |  |  |  _  | __  |     |  |  |     |_   _|  |  |
  |__   |   --|     |  |__|     | __ -|-   -|  |__|-   -| | | |_   _|
  |_____|_____|__|__|_____|__|__|_____|_____|_____|_____| |_|   |_|  
                                                                    
              _____ _____ _____ _____ _____ _____                   
              | __  |   __|  _  |     | __  |_   _|                  
              |    -|   __|   __|  |  |    -| | |                    
              |__|__|_____|__|  |_____|__|__| |_|                    
`
}

export const Teardown = {
  header: `
  _____ _____ _____ _____ ____  _____ _ _ _ _____ 
  |_   _|   __|  _  | __  |    \\|     | | | |   | |
    | | |   __|     |    -|  |  |  |  | | | | | | |
    |_| |_____|__|__|__|__|____/|_____|_____|_|___|

  We will now terminate the cluster used in the Data Center Application Performance testing.
`

}