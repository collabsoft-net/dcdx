# The Unofficial Atlassian Data Center Plugin Development CLI

## Mission statement

The goal of DCDX is to provide with convenience commands to speed up development of Atlassian apps on the various Atlassian Data Center products.

### Sounds great, how does that work?

Once installed, the DCDX command-line utility can be used to quickly start one of the following Atlassian Data Center products:

- Jira
- Confluence
- Bamboo
- Bitbucket

It includes local versions of one of the following supported databases:

- PostgreSQL (default)
- MySQL
- Microsoft SQL Server

It comes with a lot of plumbing that you would otherwise need to do manually, like a pre-installed 72H developer license (except for Bitbucket) and creating the database with appropriate settings.

### How does this compare to the Atlassian SDK?

Glad you asked! We want to be absolutely clear that this is in no way endorsed by Atlassian, nor is it meant to replace the Atlassian SDK or AMPS. You can still use the official methods for developming Data Center apps.

However, we have found that for us the official SDK is not sufficient. It has not received many updates and has become sluggish. In addition, the default embedded H2 database is marked deprecated and support will be dropped in future versions of Atlassian products. Many host products also do not run well on Apple Silicon when started using the Atlassian SDK.

In short: the purpose of the DCDX CLI is not to replace the Atlassian SDK, but provide convenience methods for app developers in the hope that it will speed up their development flow.

## Installation

Install DCDX from NPM as a global package:

`npm install -g dcdx`

You can now output the usage information.

`dcdx --help` or `dcdx <command> --help`

That's it, you're good to go!

## Quick Start

You can start a version of the Atlassian Data Center product with the default databases (PostgreSQL) with a single command:

```
$ dcdx run:jira
```

If you wish to select a different database, you can run

```
$ dcdx run jira -d mssql
```

### Prerequisites (the fine print)

DCDX is created using NodeJS and specifically designed for a workflow that uses Docker. At this point, the following tools are required:

- NodeJS + NPM
- Docker
- Docker Compose

## Contributions

We're happy to accept any contribution in the form of issue reports and/or PRs.

It is recommended to file an issue before starting work on a PR to make sure that we agree to the proposed fix before you start doing any work.

## License & other legal stuff

MIT license
Copyright (c) 2024 Collabsoft

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Important usage notice

The packages in this project rely heavily on other 3rd party Open Source projects, install through npm/yarn. These projects all have their own licenses. Although commercial use of Collabsoft packages is permitted under the MIT license, this right is limited to the "original content" created as part of this project. Please make sure you check the licenses of all 3rd party components. Collabsoft cannot be held responsible for non-compliance with 3rd party licenses when using the packages or source code. The use of 3rd party projects is listed in the dependency section of the package.json or inline in the code (when applicable).
