# Developing

## IDE

To create `node_modules`, run `bazel run tools/nodejs:install`.

## Format

To format, run `bazel run :format`.

To lint, run `bazel run :lint`.

## Documentation

To generate documentation:

```sh
bazel run :doc
```

## NPM

After updating `package.json` or `test/package.json`, run
`bazel run :npm_resolve` to resolve the packages.

## Refresh

After some changes, `bazel run :refresh` is required.

This will update the list of `--deleted_packages` (for linting and tests) and
the bootstrapped JS products.
