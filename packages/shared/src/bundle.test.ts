import { describe, it, expect } from "vitest";
import { encodeBundle, decodeBundle, type Bundle } from "./bundle.js";

describe("bundle codec", () => {
  it("round-trips", () => {
    const b: Bundle = {
      v: 1,
      kemCiphertext: "a".repeat(20),
      aesNonce: "b".repeat(16),
      aesCiphertext: "c".repeat(40),
      aesTag: "d".repeat(22),
    };
    const enc = encodeBundle(b);
    expect(typeof enc).toBe("string");
    const dec = decodeBundle(enc);
    expect(dec).toEqual(b);
  });
  it("rejects v != 1", () => {
    const bad = Buffer.from(JSON.stringify({ v: 2, kemCiphertext:"", aesNonce:"", aesCiphertext:"", aesTag:"" })).toString("base64");
    expect(() => decodeBundle(bad)).toThrow(/version/);
  });
});
