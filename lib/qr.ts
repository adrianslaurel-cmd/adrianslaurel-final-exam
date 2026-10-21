// The QR code only carries the event code. Everything else (event exists? open?
// time window? duplicate?) is validated by the database function record_attendance().
export type QRPayload = {
  v: 1;
  event: string;
};

export function buildQRPayload(eventCode: string): string {
  const payload: QRPayload = { v: 1, event: eventCode };
  return JSON.stringify(payload);
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 300) {
    return { ok: false, message: 'Invalid QR code.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Invalid QR code: this is not an attendance QR.' };
  }

  if (
    !parsed ||
    parsed.v !== 1 ||
    typeof parsed.event !== 'string' ||
    !/^[A-Za-z0-9_-]{3,40}$/.test(parsed.event)
  ) {
    return { ok: false, message: 'Invalid QR code: this is not an attendance QR.' };
  }

  return { ok: true, payload: { v: 1, event: parsed.event } };
}
