---
title: GitHub website hosting
description: ADR documenting the decision to use GitHub Pages as the hosting platform for project documentation.
---

## Summary

### Problem statement

We need a hosting platform for our documentation site that is cost-effective, simple to set up, and integrates seamlessly with our GitHub-based development workflow.

### Decision outcome

We chose GitHub Pages as the hosting platform for our documentation site.

If SSR or server-side functions (e.g. to process form submissions) become a requirement, we'd likely switch to Netlify or Cloudflare Pages.

- **Positive consequences**

  - Zero cost to host.
  - Simple setup with SSL certificates and custom domain support.
  - Tight integration with GitHub actions and repo settings for automated deployment.
  - Doesn't require managing another service.

- **Negative consequences**
  - Does not support server-side rendering (SSR) or dynamic functions, which may limit future enhancements.
  - PR previews are more difficult to set up than on other platforms.

### Decision drivers

- **Cost** - Free or very low cost to host.
- **Simplicity** - Easy setup with built-in SSL and custom domain support.
- **GitHub integration** - Streamlined deployments via GitHub actions and support for PR previews.

## Options considered

- **GitHub Pages** - [GitHub Pages](https://pages.github.com/) offers free hosting, SSL certificates, and GitHub integration for automated deployments.
- **Cloudflare Pages** - [Cloudflare Pages](https://pages.cloudflare.com/) provides global CDN performance and edge functions but may require additional setup.
- **AWS Amplify** - [AWS Amplify](https://aws.amazon.com/amplify/) supports dynamic features and scalability but introduces added complexity and cost.
- **Netlify** - [Netlify](https://www.netlify.com/) simplifies deployments with rich integrations and functions but has a higher cost for advanced features.
- **Vercel** - [Vercel](https://vercel.com/) is optimized for Next.js and modern frameworks but is more costly for advanced use cases.

## Evaluation

### Side-by-side

| Criteria           | GitHub Pages | Cloudflare Pages | AWS Amplify  | Netlify      | Vercel       |
| ------------------ | ------------ | ---------------- | ------------ | ------------ | ------------ |
| Cost               | ✅ Free      | ✅ Free          | 🟡 Low       | 🟡 Low       | 🟡 Low       |
| Simplicity         | ✅ Easy      | 🟡 Moderate      | ❌ Complex   | ✅ Easy      | ✅ Easy      |
| GitHub integration | ✅ Good      | ✅ Good          | 🟡 Partial   | ✅ Good      | ✅ Good      |
| Dynamic features   | ❌ None      | ✅ Supported     | ✅ Supported | ✅ Supported | ✅ Supported |
| CDN/Performance    | 🟡 Basic     | ✅ Global CDN    | ✅ CDN       | ✅ CDN       | ✅ CDN       |

### Option 1: GitHub Pages

:::note[Bottom line]
GitHub Pages is best if:

- we prioritize cost, simplicity, managing fewer services
- but can compromise on dynamic features and server-side rendering
  :::

- **Pros**
  - Free hosting with SSL and custom domains.
  - Simple setup and integration with GitHub workflows.
  - Ideal for static sites and documentation.
- **Cons**
  - No server-side rendering (SSR) or dynamic functions.

### Option 2: Cloudflare Pages

:::note[Bottom line]
Cloudflare Pages is best if:

- we prioritize performance and edge functions
- but can compromise on a slightly more complex setup
  :::

- **Pros**
  - Free tier with global CDN
  - Supports serverless edge functions
- **Cons**
  - More complex setup for advanced features

### Option 3: AWS Amplify

:::note[Bottom line]
AWS Amplify is best if:

- we prioritize scalability and dynamic features
- but can compromise on simplicity and cost
  :::

- **Pros**
  - Supports SSR, API integrations, and scalability
  - Integration with AWS ecosystem
- **Cons**
  - More complex setup
  - Has upfront costs (unlike GitHub pages)

### Option 4: Netlify

:::note[Bottom line]
Netlify is best if:

- we prioritize ease of use and features like form processing
- but can compromise on cost once we exceed the free plan
  :::

- **Pros**
  - Easy setup with GitHub integration
  - Supports serverless functions and SSR
  - Provides simple web form integration and storage
- **Cons**
  - More expensive for advanced features
  - Less commonly used for Government projects

### Option 5: Vercel

:::note[Bottom line]
Vercel is best if:

- we want a turnkey hosting solution, and needed to switch to Next.js
- but can compromise once we exceed the free plan
  :::

- **Pros**
  - Optimized for modern frameworks like Next.js
  - Supports server-side rendering and API routes
- **Cons**
  - More expensive for advanced features
  - Less commonly used for Government projects
  - Slight bias towards Next.js (compared to other JS frameworks like Astro)

## Conclusion

GitHub Pages is the best fit for our documentation hosting needs, offering free hosting, simple setup, and seamless GitHub integration. While it lacks dynamic features, it aligns well with our current requirements for a static documentation site.
