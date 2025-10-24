# TypeSpec Versioning Changelog

A TypeSpec library that generates a changelog for your versioned namespaces. This library is designed to be used in conjunction with the [@typespec/versioning](https://www.npmjs.com/package/@typespec/versioning) library.

## Quickstart

### Installation

```bash
npm install typespec-versioning-changelog @typespec/versioning
```

### Create a TypeSpec project

Add the following to `main.tsp`:

```typespec
// main.tsp
import "@typespec/versioning";

using Versioning;

@versioned(Versions)
namespace Service;

enum Versions {
  v1,
  v2,
}

@added(Versions.v1)
model Person {
  id: string;

  @added(Versions.v2)
  name: string;
}
```

### Generate a changelog

```bash
tsp compile --emit typespec-versioning-changelog
```

### Output

This will generate the following file in `tsp-output/typespec-versioning-changelog/changelog.json`:

```json
{
  "Person": [
    {
      "version": "v1",
      "changes": ["Schema created"]
    },
    {
      "version": "v2",
      "changes": ["Added `name` field"]
    }
  ]
}
```

## Coverage

This emitter currently supports the following versioning decorators:

- `@Versioning.added`
- `@Versioning.removed`
- `@Versioning.renamedFrom`
- `@Versioning.madeRequired`
- `@Versioning.madeOptional`
- `@Versioning.typeChangedFrom`

## Other examples

### Multiple models

Aggregates changes by model and version. The following input:

```typespec
import "@typespec/versioning";

using Versioning;

@versioned(Versions)
namespace Service;

enum Versions {
  v1,
  v2,
}

@added(Versions.v1)
model Person {
  id: string;

  @added(Versions.v2)
  name: string;

  @madeOptional(Versions.v2)
  age?: integer;
}

@added(Versions.v2)
model Car {
  id: string;
  make: string;
}
```

Generates the following output:

```json
{
  "Person": [
    {
      "version": "v1",
      "changes": ["Schema created"]
    },
    {
      "version": "v2",
      "changes": ["Added `name` field", "Made `age` field optional"]
    }
  ],
  "Car": [
    {
      "version": "v2",
      "changes": ["Schema created"]
    }
  ]
}
```

### Multiple namespaces

Aggregates changes from all namespaces into a single changelog file. The following input:

```typespec
import "@typespec/versioning";

using Versioning;

@versioned(Versions)
namespace Service;

enum Versions {
  v1,
  v2,
  v3,
}

namespace People {
  @added(Versions.v1)
  model Person {
    id: string;
    name: string;
  }
}

namespace Things {
  @added(Versions.v2)
  model Car {
    id: string;
    make: string;
  }

  @added(Versions.v3)
  model Pet {
    id: string;
    brand: string;
  }
}
```

Generates the following output:

```json
{
  "Person": [
    {
      "version": "v1",
      "changes": ["Schema created"]
    }
  ],
  "Car": [
    {
      "version": "v2",
      "changes": ["Schema created"]
    }
  ],
  "Pet": [
    {
      "version": "v3",
      "changes": ["Schema created"]
    }
  ]
}
```

### Kitchen sink example

This example demonstrates all the supported versioning decorators. The following input:

```typespec
import "@typespec/versioning";

using Versioning;

@versioned(Versions)
namespace Service;

enum Versions {
  v1,
  v2,
  v3,
}

@added(Versions.v1)
model Person {
  @typeChangedFrom(Versions.v2, integer)
  id: string;

  name: string;

  @added(Versions.v2)
  age?: integer;
}

@added(Versions.v2)
model Car {
  id: string;

  @renamedFrom(Versions.v3, "kind")
  make: string;

  @added(Versions.v2)
  @madeOptional(Versions.v3)
  color?: string;
}
```

Generates the following output:

```json
{
  "Person": [
    {
      "version": "v1",
      "changes": ["Schema created"]
    },
    {
      "version": "v2",
      "changes": [
        "Added `age` field",
        "Changed `id` field type from string to integer"
      ]
    }
  ],
  "Car": [
    {
      "version": "v2",
      "changes": ["Schema created", "Added `color` field"]
    },
    {
      "version": "v3",
      "changes": [
        "Made `color` field optional",
        "Renamed `kind` field to `make`"
      ]
    }
  ]
}
```
