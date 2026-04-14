export interface Bundle {
  v: 1;
  kemCiphertext: string;   // base64
  aesNonce: string;        // base64
  aesCiphertext: string;   // base64
  aesTag: string;          // base64
}

const toB64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
const fromB64 = (s: string) => decodeURIComponent(escape(atob(s)));

export function encodeBundle(b: Bundle): string {
  if (b.v !== 1) throw new Error("unsupported bundle version");
  return toB64(JSON.stringify(b));
}

export function decodeBundle(s: string): Bundle {
  const parsed = JSON.parse(fromB64(s));
  if (parsed?.v !== 1) throw new Error("unsupported bundle version");
  return parsed as Bundle;
}
