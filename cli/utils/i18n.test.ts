import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MESSAGES, resolveLocale, t } from "./i18n.js";

describe("resolveLocale", () => {
  const originalLang = process.env.LANG;

  afterEach(() => {
    if (originalLang === undefined) {
      delete process.env.LANG;
    } else {
      process.env.LANG = originalLang;
    }
  });

  it('returns "en" for LANG=en_US.UTF-8', () => {
    process.env.LANG = "en_US.UTF-8";
    expect(resolveLocale()).toBe("en");
  });

  it('returns "ko" for LANG=ko_KR.UTF-8', () => {
    process.env.LANG = "ko_KR.UTF-8";
    expect(resolveLocale()).toBe("ko");
  });

  it('defaults to "en" for empty LANG', () => {
    process.env.LANG = "";
    expect(resolveLocale()).toBe("en");
  });

  it('defaults to "en" when LANG is not set', () => {
    delete process.env.LANG;
    expect(resolveLocale()).toBe("en");
  });
});

describe("t()", () => {
  const originalLang = process.env.LANG;

  beforeEach(() => {
    process.env.LANG = "en_US.UTF-8";
  });

  afterEach(() => {
    if (originalLang === undefined) {
      delete process.env.LANG;
    } else {
      process.env.LANG = originalLang;
    }
  });

  it("returns ko text when LANG=ko_KR.UTF-8", () => {
    process.env.LANG = "ko_KR.UTF-8";
    const result = t("install.sudoRefused");
    expect(result).toBe(MESSAGES["install.sudoRefused"]?.ko);
  });

  it("returns en text when LANG=en_US.UTF-8", () => {
    process.env.LANG = "en_US.UTF-8";
    const result = t("install.sudoRefused");
    expect(result).toBe(MESSAGES["install.sudoRefused"]?.en);
  });

  it("interpolates {pid} correctly", () => {
    process.env.LANG = "en_US.UTF-8";
    const result = t("install.lockHeld", { pid: 12345 });
    expect(result).toContain("12345");
    expect(result).not.toContain("{pid}");
  });

  it("interpolates {pid} correctly in Korean", () => {
    process.env.LANG = "ko_KR.UTF-8";
    const result = t("install.lockHeld", { pid: 9999 });
    expect(result).toContain("9999");
    expect(result).not.toContain("{pid}");
  });

  it("returns message without interpolation when no vars passed", () => {
    process.env.LANG = "en_US.UTF-8";
    const result = t("install.sudoRefused");
    expect(result).toBe(MESSAGES["install.sudoRefused"]?.en);
  });
});
