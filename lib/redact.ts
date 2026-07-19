const EMAIL_PATTERN = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+/g;

const PHONE_PATTERN =
  /(\+?972[-\s]?|0)(([23489]|5[0-9]|7[0-9])[-\s]?\d{3}[-\s]?\d{4}|[23489][-\s]?\d{7})/g;

const ID_NUMBER_PATTERN = /\b\d{9}\b/g;

const ADDRESS_PATTERN =
  /\b(?:רחוב|רח['׳]|שדרות|שד['׳])\s+[^\n,.]{2,40}\s+\d{1,4}\b|\b\d{1,4}\s+[A-Za-z][A-Za-z\s]{2,30}\b(?:street|st\.?|avenue|ave\.?|road|rd\.?|blvd\.?|boulevard)\b/gi;

export function redactContactDetails(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[REDACTED]")
    .replace(ADDRESS_PATTERN, "[REDACTED]")
    .replace(PHONE_PATTERN, "[REDACTED]")
    .replace(ID_NUMBER_PATTERN, "[REDACTED]");
}
