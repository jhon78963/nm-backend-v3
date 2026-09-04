type HeaderValue = string | string[] | undefined;

function firstHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

export function resolveClientIp(
  headers: Record<string, HeaderValue> | Headers,
): string | undefined {
  const read = (key: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(key)?.trim() || undefined;
    }

    return firstHeaderValue(headers[key.toLowerCase()] ?? headers[key]);
  };

  const forwarded = read('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  return read('x-real-ip') ?? read('cf-connecting-ip');
}
