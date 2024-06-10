export default {
    "src/**/*.ts": [
      "eslint --cache --cache-location ./node_modules/.cache/eslint --fix",
      "prettier --write",
      // TSC can apparently take either filepath inputs, or a project config.
      // lint-staged is passing in filename inputs, but we want the project config.
      // empty function removes the filepaths
      () => "tsc --noEmit",
    ],
  };