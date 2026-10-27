# Adopting CommonGrants as a state

This playbook walks you through getting your state's grant listings into a CommonGrants-compliant format, from taking stock of what you publish today to running a CommonGrants API. Once your listings speak the same language as other CommonGrants sources, any tool or platform built on CommonGrants can read them without a custom integration, so applicants can find your grants wherever they look.

Already know where your data lives? Skip to [Choose how to bring your data together](#choose-how-to-bring-your-data-together).

## Take inventory

List every place your state publishes grant opportunities today, including agency websites, portals, and spreadsheets. This shows you how scattered the data is, and it gives you a baseline to measure progress against later.

## Choose how to bring your data together

States bring grant data together in different ways. CommonGrants works with all of them, and you can start with one and move to another later.

| Approach                              | What changes for agencies                              | Tradeoff                                                   |
| ------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Collect what agencies already publish | Nothing. A tool pulls listings from agency websites.   | Data can lag and is harder to keep consistent              |
| Each agency publishes a standard file | Each agency posts its listings at a stable web address | Agencies keep control, but each needs some technical skill |
| One shared intake platform            | Agencies submit to a single statewide system           | Best data quality, but asks for the most change            |

## Connect your data to CommonGrants

Each step builds on the one before it. You can stop at whichever step makes sense for your state.

1. **Map your data.** Compare your state's grant data to the [CommonGrants models](https://commongrants.org/protocol/models/) and the [custom fields catalog](https://commongrants.org/custom-fields/). Propose new custom fields for anything that does not map yet. This step needs no engineering work.
2. **Build a plugin.** Package that mapping so it can be reused. A plugin bundles your custom fields, search filters, and the logic that translates your data into CommonGrants. The [Python](https://commongrants.org/guides/using-python/) and [TypeScript](https://commongrants.org/guides/using-typescript/) guides walk through it, and the [plugins catalog](https://commongrants.org/plugins/) has examples to learn from.
3. **Stand up a CommonGrants API.** Use one of our API templates with your plugin to run a small service that reads from your current data source and returns it in the CommonGrants format. Your current system stays as it is. See [Getting started](https://commongrants.org/getting-started/) for the templates and command-line tool.
4. **Serve CommonGrants directly (optional).** Add CommonGrants routes to your own API, with nothing in between. This is for states ready to run the standard themselves. See the [specification](https://commongrants.org/protocol/specification/).

## Keep it going

Once your listings are in one place, use them to make the case for longer-term changes to how your agencies collect and publish grant data. Your inventory gives you a way to measure how well those changes stick.

When your API is live, [add it to the implementations catalog](https://commongrants.org/implementations/overview/#adding-an-implementation) so others can find it.

## Get help

If you would like help getting started, or want to propose new fields for the standard, ask in the [CommonGrants forum](https://forum.simpler.grants.gov/c/commongrants/8).
