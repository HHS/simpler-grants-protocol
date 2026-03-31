# Contributing guidelines

CommonGrants is an open protocol for sharing structured grants data across platforms. We welcome contributions from anyone, especially if you build grant management software, work in government, manage data standards, or support nonprofits. There are many ways to get involved, and not all of them require writing code.

Before contributing, we encourage you to read our [LICENSE](LICENSE.md) and [README](README.md) files. If you have any questions, post on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8) or reach out to the team.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
  - [Vote and shape the roadmap](#vote-and-shape-the-roadmap)
  - [Propose a custom field](#propose-a-custom-field)
  - [Suggest a form for the form library](#suggest-a-form-for-the-form-library)
  - [Propose questions for the question bank](#propose-questions-for-the-question-bank)
  - [Adopt CommonGrants](#adopt-commongrants)
  - [Build a plugin or adapter](#build-a-plugin-or-adapter)
  - [Get involved in stewardship](#get-involved-in-stewardship)
  - [Report a bug](#report-a-bug)
  - [Request new functionality](#request-new-functionality)
  - [Contribute to the codebase](#contribute-to-the-codebase)
- [Getting started](#getting-started)
- [Questions?](#questions)

## Ways to contribute

### Vote and shape the roadmap

The best way to influence what gets built next is to vote on our [co-planning board](https://commongrants.fider.io). The board lists proposed features and improvements, and community members can vote and comment to help the team prioritize. This is one of the most impactful ways to contribute, and it takes just a few minutes.

How to participate:

1. Browse existing proposals at [commongrants.fider.io](https://commongrants.fider.io)
2. Vote for the features that matter most to you
3. Add comments with context about why a feature is important or how you would use it
4. Don't see what you're looking for? Submit a [feature request](https://github.com/HHS/simpler-grants-protocol/issues/new?template=2-feature-request.yml) on GitHub for consideration

### Propose a custom field

The CommonGrants protocol defines a base set of data fields that all implementations share. Beyond those, the [custom fields catalog](https://commongrants.org/custom-fields/) lets the community propose and standardize additional fields that are common across funders or platforms but not part of the core spec. For example, fields specific to a grant type (research grants, community development) or fields that capture data most platforms already collect but in different formats.

If you have an idea for a custom field but are not sure how to define it technically, start a thread on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8) describing the field name, what it captures, and why it is needed. You can also submit a [feature request](https://github.com/HHS/simpler-grants-protocol/issues/new?template=2-feature-request.yml) on GitHub directly.

If you are ready to technically define the field yourself, follow the process described in the [custom fields overview](https://commongrants.org/custom-fields/) on our website. You will need to define the field in TypeSpec, register it in the catalog, and open a pull request. Include context about why the field is useful and which implementations could benefit from it.

### Suggest a form for the form library

The form library translates common grant application forms into the CommonGrants format, making it easier for platforms to support standardized applications.

How to suggest a form:

1. Submit a [feature request](https://github.com/HHS/simpler-grants-protocol/issues/new?template=2-feature-request.yml) on GitHub describing the form, which funders or programs use it, and why standardizing it would help
2. If you want to discuss the idea first, start a thread on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8)

### Propose questions for the question bank

The question bank is a collection of standardized application questions that funders can use when building grant applications. Proposing a question helps reduce duplicated effort across platforms and makes it easier for applicants who apply to multiple programs.

How to propose a question:

1. Submit a [feature request](https://github.com/HHS/simpler-grants-protocol/issues/new?template=2-feature-request.yml) on GitHub describing your proposed question, the expected answer format, and which types of grant applications commonly ask it
2. If you want to discuss the idea first or see what others think, start a thread on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8)

### Adopt CommonGrants

Adopting the protocol is one of the most valuable contributions to the community. There are several levels of adoption, and each one builds on the last. You do not have to start at the top.

1. **Cross-walk your data.** Map your grant data elements to CommonGrants fields. Where your data does not map to the core models or existing custom fields, propose new ones for the catalog. This is a useful exercise even if you go no further, because it surfaces gaps in the protocol and helps us understand what real-world data looks like.
2. **Build an adapter.** Package the transformation logic needed to translate data between your format and CommonGrants. See [Build a plugin or adapter](#build-a-plugin-or-adapter) for details.
3. **Stand up an API proxy.** Create a CommonGrants-compliant wrapper around your existing API using one of the SDK templates and your adapter. The proxy forwards requests to your existing system and translates responses into the CommonGrants format. This works especially well when your data or API is already publicly available.
4. **Implement directly.** Build CommonGrants routes natively into your platform or API.

If your data or API is publicly available, the first three can also be done by a third party on your behalf, which means community members like platform vendors or civic tech organizations can help drive adoption for states and funders who may not have the capacity to do it themselves.

If you are a state, platform, or organization exploring adoption at any level, we want to hear from you. Share your experience on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8), and reach out to the team if you want help getting started.

### Build a plugin or adapter

Plugins extend the CommonGrants SDKs with additional functionality. Adapters translate data from existing grant platforms into the CommonGrants format, so that platforms can adopt the protocol without rebuilding their systems. This can enable your platform to interoperate with others in the ecosystem without changing your internal data model. If you are interested in learning more about building an adapter, reach out on the [forum](https://forum.simpler.grants.gov/c/commongrants/8) and the CommonGrants maintainers can help you get started.

How to build a plugin or adapter:

1. Review the plugin framework documentation on [commongrants.org](https://commongrants.org)
2. Use the SDK plugin tooling to scaffold your project
3. Publish your plugin to npm or PyPI under your own namespace
4. Share your plugin with the community by posting on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8) or opening a pull request

### Get involved in stewardship

CommonGrants is transitioning toward community-led governance. The long-term vision is for the protocol to be stewarded by the organizations that adopt and contribute to it, not by any single agency or contractor. There are several ways to get involved:

- **Express interest in the stewardship group.** We are forming a group of representatives from across the grants ecosystem who meet quarterly to advise on protocol direction and governance decisions. Stewards may be eligible to receive a stipend for their participation. If your organization is interested, reach out to the team.
- **Share governance experience.** If your organization has navigated a similar transition, such as building community governance around an open standard or shared infrastructure, we want to learn from you. What worked, what didn't, and what you would do differently.
- **Connect us with others.** If you know organizations that should be part of this conversation, whether they are funders, platforms, government agencies, or data standards groups, we would love to get in touch with them.

For more context on the stewardship model and roadmap, see the [community stewardship ADR](https://commongrants.org/governance/adr/0021-community-stewardship/) on the CommonGrants website.

### Report a bug

If you think you have found a bug, we'd love your help identifying and fixing it. Bugs can be reported against the protocol spec, the SDKs, or the documentation.

1. **Search the issue list:** Check to see if anyone has reported a similar issue. If so, comment on that issue with additional details or context.
2. **Use the issue template:** If no one else has reported it yet, please submit a new issue and select the [bug report template](https://github.com/HHS/simpler-grants-protocol/issues/new?template=1-bug-report.yml).
3. **Check the Bug Tracker:** Check the status of your bug by referencing the [bug tracker](https://github.com/HHS/simpler-grants-protocol/issues?q=state%3Aopen%20label%3Abug).

When filing a bug, include as much context as you can: what you were trying to do, what happened, and what you expected. For protocol-level issues, file in [simpler-grants-protocol](https://github.com/HHS/simpler-grants-protocol). For SDK-specific bugs, file in the appropriate SDK repo.

### Request new functionality

If you don't have specific language or code to submit but would like to suggest a change, request a feature, or have something addressed, we'd love to get your feedback. To request new functionality, please follow these guidelines:

1. **Search the issue list:** Check the list of existing issues to see if anyone has requested a similar feature or functionality. If so, feel free to comment on that issue with more context or details.
2. **Use the issue template:** If no one else has requested something similar, please submit a new issue and select the [Feature Request](https://github.com/HHS/simpler-grants-protocol/issues/new?template=2-feature-request.yml) template.

> **NOTE:** Not all feature requests will be implemented. The project maintainers will review each feature request and consider scoping it into the roadmap or explain why the feature won't be implemented.

### Contribute to the codebase

If you've implemented a new feature, fixed a bug, or made some documentation clearer, we'd love to consider your contribution. Good documentation is just as valuable as code, so if you notice gaps or unclear explanations, a pull request is welcome.

1. **Fork the repo:** Create a copy of this repo where you can make your proposed changes by [following the GitHub forking methodology](https://docs.github.com/en/github/getting-started-with-github/quickstart/fork-a-repo).
2. **Find or create an issue:** Before proposing a change, make sure there is a corresponding issue (i.e. Bug Fix, Task, Feature Request) that describes the contribution you'll be making. If there isn't an existing issue, create a new one by selecting and filling out a template from the [issue tab](https://github.com/HHS/simpler-grants-protocol/issues/new/choose).
3. **Create a feature branch:** Create a feature branch on your forked repository with a descriptive name, ideally one that references the issue number that your contribution is related to (e.g., `issue-10-unit-testing`).
4. **Make changes and test them:** Add your code or documentation and commit those changes to the feature branch. If your contribution includes code, make sure you've written tests for it and that all of the tests are passing.
5. **Submit a pull request:** When you're ready to make your contribution, [submit a pull request against the upstream repo](https://docs.github.com/en/github/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork) and fill out the PR template sections so that project maintainers can begin to review your contributions.
6. **Fix requested changes:** As maintainers review your proposed contribution, they may request specific changes. If so, simply add and commit those changes to the feature branch directly and they'll automatically show up on the PR.

## Getting started

**CommonGrants resources**

- [CommonGrants website](https://commongrants.org) (protocol docs, API docs, custom field catalog, form library)
- [GitHub repository](https://github.com/HHS/simpler-grants-protocol) (protocol spec, SDKs, issues)
- [Public roadmap](https://github.com/orgs/HHS/projects/12/views/11) (tentative and subject to change)
- [Code of conduct](CODE_OF_CONDUCT.md)

**Collaboration tools**

- [Co-planning board](https://commongrants.fider.io)
- [Community forum](https://forum.simpler.grants.gov/c/commongrants/8)

**Open source resources**

- [GitHub Tutorials](https://lab.github.com/)
- [How to contribute to open source software](https://opensource.guide/how-to-contribute/)

## Questions?

If you are not sure where to start or how your work fits in, post on the [community forum](https://forum.simpler.grants.gov/c/commongrants/8) or reach out. We are happy to help.
