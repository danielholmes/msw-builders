async function extractBodyContent(
  requestOrResponse: Pick<Response, "headers" | "json" | "formData">,
): Promise<Record<string, unknown>> {
  const contentType = requestOrResponse.headers.get("Content-Type");
  if (contentType === "application/json") {
    return requestOrResponse.json();
  }
  if (contentType?.startsWith("multipart/form-data")) {
    const data = await requestOrResponse.formData();
    return Object.fromEntries(data.entries());
  }

  return {};
}

export { extractBodyContent };
