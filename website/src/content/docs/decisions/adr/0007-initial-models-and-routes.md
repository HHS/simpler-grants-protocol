---
title: v0.1.0 models and routes
description: This ADR documents the decision to focus on the models and routes needed for search.
---

## Summary

### Problem statement

The v0.1.0 release of the protocol should include enough functionality that we demonstrate immediate value, without prematurely defining requirements that may discourage adoption.

_Which models and routes should the v0.1.0 release of the protocol include?_

### Decision outcome

We'll limit the scope of the v0.1.0 protocol to the models and routes needed to support search, while also defining foundational types that make it easier to extend the base spec in the future.

- **Positive consequences**
  - Ensures the protocol is immediately useful for discovering funding opportunities.
  - Facilitates early adoption by avoiding unnecessary complexity and controversial elements.
  - Enables a clear and feasible implementation path for v0.1.0.
  - Lays the foundation for expansion in subsequent versions.
- **Negative consequences**
  - Will require future updates to accommodate additional models and operations.
  - Could limit initial functionality for specific advanced use cases, such as post-award reporting.
  - May be harder to make changes once platforms have started adopting the protocol.

### Decision drivers

- Encourage early adoption by multiple platforms and stakeholders.
- Establish foundational elements without over-committing to complex use cases.
- Demonstrate immediate value while enabling iterative development.
- Avoid discouraging adoption by imposing unnecessary burdens.

### Options considered

#### Data types

1. **Base types:** Includes essential reusable fields such as currency, GeoJSON, and custom fields.
2. **Grant opportunity models:** Models describing the metadata for grant opportunities.
3. **Individuals and organizations:** Basic models for describing grantors and grant seekers.
4. **Application forms and submissions:** Models describing application processes and submission structures.
5. **Grant awards and reporting:** Models for tracking awarded grants and reporting requirements.

#### Operations

1. Searching and viewing opportunities\*\*
2. Saving or subscribing to opportunities
3. Managing organization membership
4. Filling out and submitting applications
5. Checking application statuses
6. Completing post-award reporting

## Evaluation

### Side-by-side

| Criteria                      | Base types | And Search | And Apply | And post-award |
| ----------------------------- | ---------- | ---------- | --------- | -------------- |
| Ease of adoption              | ✅         | ✅         | 🟡        | ❌             |
| Completeness of functionality | ❌         | 🟡         | ✅        | ✅             |
| Implementation simplicity     | ✅         | ✅         | 🟡        | ❌             |

### Option 1: Base types only

- **Pros**:
  - Very simple implementation.
  - Minimal barriers to early adoption.
- **Cons**:
  - Severely limited functionality; would not meet user expectations.

### Option 2: Also support search

Also include models and routes needed to support searching for opportunities.

- **Pros**:
  - Enables users to discover funding opportunities effectively.
  - Adds necessary functionality while maintaining simplicity.
- **Cons**:
  - Leaves out application and reporting processes for future versions.

### Option 3: Also support apply

Also include models and routes needed to support filling out and submitting applications.

- **Pros**:
  - Allows users to engage directly with funding opportunities.
  - Supports application creation and submission processes.
  - Moves us closer
- **Cons**:
  - Increases implementation complexity.
  - Application processes can vary significantly by platform and grant.
  - Might be hard to land on a common standard in time for v0.1.0

### Option 4: Also support post-award reporting

Also include models and routes needed to support post-award grant reporting.

- **Pros**:
  - Provides end-to-end functionality for the entire grant lifecycle.
  - Addresses advanced use cases for reporting and compliance.
- **Cons**:
  - High complexity and potential resistance from stakeholders.
  - Longer implementation timelines.
  - Reporting requirements also vary greatly across grants and platforms.
