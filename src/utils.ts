/* eslint-disable @typescript-eslint/no-explicit-any */
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

  if (
    contentType?.startsWith("multipart/form-data") ||
    contentType?.startsWith("application/x-www-form-urlencoded")
  ) {
    const data = await requestOrResponse.formData();
    return Object.fromEntries(data.entries());
  }

  // TODO: Warning
  return {};
}

function trimEnd(source: string, char: string) {
  let result = source;
  while (result.endsWith(char)) {
    result = result.substring(0, result.length - char.length);
  }
  return result;
}

function trimStart(source: string, char: string) {
  let result = source;
  while (result.startsWith(char)) {
    result = result.substring(char.length);
  }
  return result;
}

function mapKeys<T extends object>(
  obj: T,
  mapper: (item: T[keyof T], key: string) => string,
): { [index: string]: T[keyof T] } {
  const result = {} as { [index: string]: T[keyof T] };
  for (const key in obj) {
    const value = obj[key];
    result[mapper(value, key)] = value;
  }
  return result;
}

function isEqual(o1: unknown, o2: unknown): boolean {
  if (o1 === o2) {
    return true;
  }

  if (Array.isArray(o1) && Array.isArray(o2)) {
    if (o1.length !== o2.length) {
      return false;
    }
    return o1.every((i1, i) => isEqual(i1, o2[i]));
  }

  if (typeof o1 === "object" && !!o1 && typeof o2 === "object" && !!o2) {
    const k1 = Object.keys(o1).sort();
    const k2 = Object.keys(o2).sort();
    if (!isEqual(k1, k2)) {
      return false;
    }

    return k1.every((k) => isEqual((o1 as any)[k], (o2 as any)[k]));
  }

  return false;
}

function isMatch(source: object, matcher: object) {
  for (const k in matcher) {
    if (!(k in source)) {
      return false;
    }

    const sourceValue = (source as any)[k];
    const matcherValue = (matcher as any)[k];
    if (typeof sourceValue === "object" && !!sourceValue) {
      return isMatch(sourceValue, matcherValue);
    }

    if (!isEqual(sourceValue, matcherValue)) {
      return false;
    }
  }
  return true;
}

// type Function0<R> = () => R;
// type Function1<T1, R> = (t1: T1) => R;
// type Function2<T1, T2, R> = (t1: T1, t2: T2) => R;
// type Function3<T1, T2, T3, R> = (t1: T1, t2: T2, t3: T3) => R;
// type Function4<T1, T2, T3, T4, R> = (t1: T1, t2: T2, t3: T3, t4: T4) => R;
type Partial = {
  // <T1, T2, R>(func: Function2<T1, T2, R>, plc1: __, arg2: T2): Function1<T1, R>;
  // <T1, T2, T3, R>(func: Function3<T1, T2, T3, R>, plc1: __, arg2: T2): Function2<T1, T3, R>;
  // <T1, T2, T3, R>(func: Function3<T1, T2, T3, R>, plc1: __, plc2: __, arg3: T3): Function2<T1, T2, R>;
  // <T1, T2, T3, R>(func: Function3<T1, T2, T3, R>, arg1: T1, plc2: __, arg3: T3): Function1<T2, R>;
  // <T1, T2, T3, R>(func: Function3<T1, T2, T3, R>, plc1: __, arg2: T2, arg3: T3): Function1<T1, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, arg2: T2): Function3<T1, T3, T4, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, plc2: __, arg3: T3): Function3<T1, T2, T4, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, arg1: T1, plc2: __, arg3: T3): Function2<T2, T4, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, arg2: T2, arg3: T3): Function2<T1, T4, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, plc2: __, plc3: __, arg4: T4): Function3<T1, T2, T3, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, arg1: T1, plc2: __, plc3: __, arg4: T4): Function2<T2, T3, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, arg2: T2, plc3: __, arg4: T4): Function2<T1, T3, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, arg1: T1, arg2: T2, plc3: __, arg4: T4): Function1<T3, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, plc2: __, arg3: T3, arg4: T4): Function2<T1, T2, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, arg1: T1, plc2: __, arg3: T3, arg4: T4): Function1<T2, R>;
  // <T1, T2, T3, T4, R>(func: Function4<T1, T2, T3, T4, R>, plc1: __, arg2: T2, arg3: T3, arg4: T4): Function1<T1, R>;
  <TS extends any[], R>(func: (...ts: TS) => R): (...ts: TS) => R;
  <TS extends any[], T1, R>(
    func: (t1: T1, ...ts: TS) => R,
    arg1: T1,
  ): (...ts: TS) => R;
  <TS extends any[], T1, T2, R>(
    func: (t1: T1, t2: T2, ...ts: TS) => R,
    t1: T1,
    t2: T2,
  ): (...ts: TS) => R;
  <TS extends any[], T1, T2, T3, R>(
    func: (t1: T1, t2: T2, t3: T3, ...ts: TS) => R,
    t1: T1,
    t2: T2,
    t3: T3,
  ): (...ts: TS) => R;
  <TS extends any[], T1, T2, T3, T4, R>(
    func: (t1: T1, t2: T2, t3: T3, t4: T4, ...ts: TS) => R,
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
  ): (...ts: TS) => R;
  // placeholder: __;
};

function basePartial(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  func: Function,
  ...args: Array<any>
) {
  return function (...callArgs: Array<unknown>) {
    return func(...[...args, ...callArgs]);
  };
}

const partial: Partial = basePartial;

export {
  mapKeys,
  partial,
  isEqual,
  trimStart,
  trimEnd,
  isMatch,
  extractBodyContent,
};
