async function extractBodyContent(
  requestOrResponse: Pick<Response, "headers" | "json" | "formData">,
): Promise<Record<string, unknown>> {
  const contentType = requestOrResponse.headers.get("Content-Type");

  // Json
  // Need to take into account custom json, e.g. application/x-amz-json-1.1
  if (
    contentType === "application/json" ||
    (contentType?.startsWith("application/") &&
      contentType.split("application/")[1].includes("json"))
  ) {
    return requestOrResponse.json();
  }

  if (contentType?.startsWith("multipart/form-data")) {
    const data = await requestOrResponse.formData();
    return Object.fromEntries(data.entries());
  }

  // TODO: Warning
  return {};
}

export { extractBodyContent };
