import { describe, expect, it } from "vitest";
import { isLocalUrl } from "./font-hosts.js";

describe("isLocalUrl", () => {
  it("allows file:, data:, and exact loopback http URLs", () => {
    expect(isLocalUrl("file:///Users/me/deck/slide-01.html")).toBe(true);
    expect(isLocalUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1/x")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:3737/slides")).toBe(true);
    expect(isLocalUrl("http://localhost:8080/viewer.html")).toBe(true);
    expect(isLocalUrl("http://[::1]:3000/")).toBe(true);
  });

  it("rejects loopback-prefixed attacker hostnames (startsWith bypass)", () => {
    // These all passed the old startsWith("http://127.0.0.1") check.
    expect(isLocalUrl("http://127.0.0.1.evil.com/beacon")).toBe(false);
    expect(isLocalUrl("http://localhost.evil.com/x")).toBe(false);
    // userinfo trick: hostname is evil.com, not 127.0.0.1
    expect(isLocalUrl("http://127.0.0.1@evil.com/x")).toBe(false);
  });

  it("rejects remote and malformed URLs", () => {
    expect(isLocalUrl("https://cdn.example.com/a.png")).toBe(false);
    expect(isLocalUrl("http://192.168.0.10/internal")).toBe(false);
    expect(isLocalUrl("not a url")).toBe(false);
    expect(isLocalUrl("")).toBe(false);
  });
});
