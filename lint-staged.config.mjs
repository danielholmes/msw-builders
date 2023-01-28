// Split up to parallelise
export default {
    "src/**/*.ts": [
      // "eslint --cache --cache-location ./node_modules/.cache/eslint --fix",
      "prettier --write"
    ],
    "src/**/*.tsx": [
      // "eslint --cache --cache-location ./node_modules/.cache/eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{ts,tsx}": [
      // TSC can apparently take either filepath inputs, or a project config.
      // lint-staged is passing in filename inputs, but we want the project config.
      // empty function removes the filepaths
      () => "tsc -p tsconfig.esm.json --noEmit",
    ],
  };