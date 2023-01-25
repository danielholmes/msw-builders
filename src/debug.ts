function consoleDebugLog(url: string, message: string) {
  console.debug(`[@dhau/msw-builders] {${url}} - ${message}`);
}

const nullLogger = () => {};

export { consoleDebugLog, nullLogger };
