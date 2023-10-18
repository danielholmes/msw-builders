async function extractBodyContent(body: Body) {
  const strategies = [
    async () => body.json(),
    async () => body.text(),
    async () => body.arrayBuffer(),
  ];
  for (const strategy of strategies) {
    try {
      return await strategy();
    } catch (e) {
      // Try next strategy
    }
  }
  return undefined;
}

export { extractBodyContent };
