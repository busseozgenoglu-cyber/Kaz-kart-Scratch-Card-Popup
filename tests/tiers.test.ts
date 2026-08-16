import { describe, expect, it } from "vitest";
import {
  FREE_PLAN_TIERS,
  TIERS,
  tierLabel,
  tierValue,
  validateProbabilities,
  type Tier,
} from "~/lib/tiers";

describe("tier katalogu", () => {
  it("dört ödül kademesi tanımlıdır ve sıralaması sabittir", () => {
    expect(TIERS).toEqual([
      "free_shipping",
      "10_percent",
      "15_percent",
      "20_percent",
    ]);
  });

  it("ücretsiz plan yalnızca ilk iki ödülü dağıtır", () => {
    expect(FREE_PLAN_TIERS).toEqual(["free_shipping", "10_percent"]);
    // Ücretsiz plan ödülleri her zaman genel katalogun alt kümesi olmalı.
    for (const tier of FREE_PLAN_TIERS) {
      expect(TIERS).toContain(tier);
    }
  });
});

describe("tierValue", () => {
  it("yüzde ödülleri için doğru sayısal değeri döndürür", () => {
    expect(tierValue("10_percent")).toBe(10);
    expect(tierValue("15_percent")).toBe(15);
    expect(tierValue("20_percent")).toBe(20);
  });

  it("kargo bedava için yüzde değeri sıfırdır", () => {
    // Kargo indirimi ayrı bir mutation ile oluşturulur; yüzde taşımaz.
    expect(tierValue("free_shipping")).toBe(0);
  });
});

describe("tierLabel", () => {
  it("desteklenen üç dilde de her ödül için etiket üretir", () => {
    for (const language of ["tr", "en", "es"]) {
      for (const tier of TIERS) {
        const label = tierLabel(tier, language);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(2);
      }
    }
  });

  it("bilinmeyen dilde Türkçeye geri düşer", () => {
    expect(tierLabel("free_shipping", "de")).toBe(
      tierLabel("free_shipping", "tr"),
    );
  });

  it("dil belirtilmezse varsayılan Türkçedir", () => {
    expect(tierLabel("20_percent")).toBe("%20 İNDİRİM");
  });
});

describe("validateProbabilities", () => {
  const weights = (
    fs: number,
    p10: number,
    p15: number,
    p20: number,
  ): Record<Tier, number> => ({
    free_shipping: fs,
    "10_percent": p10,
    "15_percent": p15,
    "20_percent": p20,
  });

  it("toplam tam 100 ise geçerlidir", () => {
    expect(validateProbabilities(weights(50, 30, 15, 5))).toEqual({
      valid: true,
      total: 100,
    });
  });

  it("toplam 100'ün altındaysa reddeder", () => {
    const result = validateProbabilities(weights(50, 30, 10, 5));
    expect(result.valid).toBe(false);
    expect(result.total).toBe(95);
  });

  it("toplam 100'ün üzerindeyse reddeder", () => {
    const result = validateProbabilities(weights(60, 30, 15, 5));
    expect(result.valid).toBe(false);
    expect(result.total).toBe(110);
  });
});
