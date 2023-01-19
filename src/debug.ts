function consoleDebugLog(url: string, message: string) {
  console.debug(`[@dhau/msw-graphql] {${url}} - ${message}`);
}

const nullLogger = () => {};

export { consoleDebugLog, nullLogger };
