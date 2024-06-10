# Dhau MSW Builders

[![Test](https://github.com/danielholmes/msw-builders/actions/workflows/test.yml/badge.svg)](https://github.com/danielholmes/msw-builders/actions/workflows/test.yml)

Some extra utilities to write MSW GraphQL and rest handlers.

## Installation

```
npm add -D @dhau/msw-builders
```

## Local Development

### Setup

1. Install system dependencies using [ASDF](https://asdf-vm.com/), or manually install the dependencies in [`.tool-versions`](./.tool-versions)
2. Install project dependencies using `npm ci`

### Publishing

1. Manually set new version in `package.json`
2. Manually set new version in `jsr.json`
3. `npm run deploy`