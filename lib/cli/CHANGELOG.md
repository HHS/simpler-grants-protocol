# @common-grants/cli

## 0.2.0

### Minor Changes

- d19c7b8: Adds support for checking against multiple protocol versions

  Enables users to specify which protocol version they want to check their API against.

  ```bash
  cg check spec --protocol-version 0.1.0
  ```

## 0.1.6

### Patch Changes

- 6edb983: Fix circular reference bug in `cg check spec`

## 0.1.5

### Patch Changes

- Updated dependencies [e50db9c]
  - @common-grants/core@0.2.1

## 0.1.4

### Patch Changes

- Updated dependencies [66b75a7]
  - @common-grants/core@0.2.0

## 0.1.3

### Patch Changes

- 4ccacfc: Fix bug in version command

## 0.1.2

### Patch Changes

- 57c75e7: Update checkSpec command to not throw error when optional props are missing

## 0.1.1

### Patch Changes

- Updated dependencies [81ab1fe]
  - @common-grants/core@0.1.1

## 0.1.0

### Minor Changes

- b26d075: Extend check spec to support OpenAPI v3.1 and remove alpha tag from CLI version number
