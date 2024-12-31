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
  - PR previews aren't supported by default.

### Decision drivers

- **Cost** - Free or very low cost to host.
- **Simplicity** - Easy setup with built-in SSL and custom domain support.
- **GitHub integration** - Streamlined deployments via GitHub actions.
- **PR previews** - Ability to preview deployments from GitHub pull requests.

### Options considered

- **GitHub Pages** - [GitHub Pages](https://pages.github.com/) offers free hosting with each GitHub repo.
- **Cloudflare Pages** - [Cloudflare Pages](https://pages.cloudflare.com/) provides free static site hosting with a global CDN and serverless "edge" functions.
- **AWS Amplify** - [AWS Amplify](https://aws.amazon.com/amplify/) paired with S3 and CloudFront CDN provides static site hosting and options to add serverless functions.
- **Netlify** - [Netlify](https://www.netlify.com/) offers static site hosting, serverless functions, and form processing.
- **Vercel** - [Vercel](https://vercel.com/) provides both static site and hybrid rendering as well as serverless functions.

## Evaluation

### Side-by-side

| Criteria           | GH Pages | Cloudflare Pages | AWS | Netlify | Vercel |
| ------------------ | :------: | :--------------: | :-: | :-----: | :----: |
| Cost               |    ✅    |        🟡        | 🟡  |   ❌    |   ❌   |
| Simplicity         |    ✅    |        🟡        | ❌  |   ✅    |   ✅   |
| GitHub integration |    ✅    |        ✅        | 🟡  |   ✅    |   ✅   |
| PR previews        |    ❌    |        ✅        | 🟡  |   ✅    |   ✅   |
| Dynamic features   |    ❌    |        ✅        | ✅  |   ✅    |   ✅   |

### Option 1: GitHub Pages

:::note[Bottom line]
GitHub Pages is best if:

- we prioritize cost, simplicity, and managing fewer services
- but can compromise on dynamic features and server-side rendering
  :::

- **Pros**
  - Free hosting with SSL and custom domains
  - Simple setup and integration with GitHub workflows
  - Ideal for static sites and documentation
- **Cons**
  - No server-side rendering (SSR) or dynamic functions
  - PR previews not easily supported

### Option 2: Cloudflare Pages

:::note[Bottom line]
Cloudflare Pages is best if:

- we prioritize performance and edge functions
- but can compromise on a slightly more complex setup
  :::

- **Pros**
  - Free tier (up to 500 builds) with global CDN
  - Easy setup with GitHub integration and deploys
  - Supports serverless edge functions
  - No marginal cost per user (unlike Netlify and Vercel)
- **Cons**
  - More complex setup for advanced features
  - Costs money if we exceed free plan (though less than Netlify or Vercel)

### Option 3: AWS Amplify, S3, and CloudFront

:::note[Bottom line]
AWS hosting is best if:

- we prioritize scalability and control
- but can compromise on simplicity and managing multiple services
  :::

- **Pros**
  - Supports SSR, API integrations, and scalability
  - Integration with AWS ecosystem
  - Cheaper cost at scale than Netlify or Vercel
- **Cons**
  - More complex setup
  - More complex pricing structure

### Option 4: Netlify

:::note[Bottom line]
Netlify is best if:

- we prioritize ease of use and features like form processing
- but can compromise on cost once we exceed the free plan
  :::

- **Pros**
  - Easy setup with GitHub integration
  - Supports serverless functions and SSR
  - Provides simple web form processing and storage
  - Provides PR previews by default
  - Integrated review process
- **Cons**
  - More expensive for advanced features
  - Monthly cost per GitHub user to trigger deploys by commit
  - Less commonly used for Government projects

### Option 5: Vercel

:::note[Bottom line]
Vercel is best if:

- we want a turnkey hosting solution, and needed to switch to Next.js
- but can compromise once we exceed the free plan
  :::

- **Pros**
  - Easy setup with GitHub integration
  - Optimized for modern frameworks like Next.js
  - Supports server-side rendering and API routes
  - Lots of advanced logging and monitoring features
- **Cons**
  - More expensive for advanced features
  - Monthly cost per GitHub user to trigger deploys by commit
  - Less commonly used for Government projects
  - Slight bias towards Next.js (compared to other JS frameworks like Astro)

## Conclusion

GitHub Pages is the best fit for our documentation hosting needs, offering free hosting, simple setup, and seamless GitHub integration. While it lacks dynamic features and PR previews it aligns well with our current requirements for a static documentation site.
