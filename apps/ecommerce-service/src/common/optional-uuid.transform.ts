import { Transform } from 'class-transformer';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toOptionalUuid(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  return UUID_REGEX.test(value) ? value : undefined;
}

export function OptionalUuidProperty(): PropertyDecorator {
  return Transform(({ value }) => toOptionalUuid(value));
}
