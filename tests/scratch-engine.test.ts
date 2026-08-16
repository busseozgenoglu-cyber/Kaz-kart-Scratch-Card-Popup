import { describe, expect, it, vi } from "vitest";

// scratch-engine.server prisma'yı import eder; saf fonksiyonları test ederken
// gerçek bir veritabanı bağlantısı kurulmasın diye modülü taklit ediyoruz.
vi.mock("~/db.server", () => ({ default: {} }));

const {
  addMonths,
  detectDevice,
  determineTier,
  generateCode,
  planLimit,
  tierWeights,
} = await import("~/lib/scratch-engine.server");

import type { Tier } from "~/lib/tiers";
import type { ShopSettings } from "@prisma/client";

/** Testler için yalnızca olasılık alanları dolu, minimal bir ayar nesnesi. */
function settings(
  fs: number,
  p10: number,
  p15: number,
  p20: number,
): ShopSettings {
  return {
    tierFreeShippingProb: fs,
    tier10PercentProb: p10,
    tier15PercentProb: p15,
    tier20PercentProb: p20,
  } as ShopSettings;
}

describe("tierWeights", () => {
  it("ayar alanlarını ödül ağırlıklarına eşler", () => {
    expect(tierWeights(settings(50, 30, 15, 5))).toEqual({
      free_shipping: 50,
      "10_percent": 30,
      "15_percent": 15,
      "20_percent": 5,
    });
  });
});

describe("determineTier", () => {
  it("her zaman geçerli bir ödül döndürür", () => {
    const config = settings(50, 30, 15, 5);
    for (let i = 0; i < 500; i++) {
      const tier = determineTier(config);
      expect([
        "free_shipping",
        "10_percent",
        "15_percent",
        "20_percent",
      ]).toContain(tier);
    }
  });

  it("ağırlığı sıfır olan ödülü asla seçmez", () => {
    // %20 kapalı: 10.000 denemede bir kez bile çıkmamalı.
    const config = settings(50, 30, 20, 0);
    for (let i = 0; i < 10_000; i++) {
      expect(determineTier(config)).not.toBe("20_percent");
    }
  });

  it("yalnızca izin verilen ödül havuzundan seçer (ücretsiz plan kısıtı)", () => {
    const config = settings(50, 30, 15, 5);
    const allowed: Tier[] = ["free_shipping", "10_percent"];
    for (let i = 0; i < 2000; i++) {
      expect(allowed).toContain(determineTier(config, allowed));
    }
  });

  it("tek ödül dışında her şey kapalıysa deterministiktir", () => {
    const config = settings(0, 0, 0, 100);
    for (let i = 0; i < 200; i++) {
      expect(determineTier(config)).toBe("20_percent");
    }
  });

  it("tüm ağırlıklar sıfırsa güvenli varsayılana düşer", () => {
    expect(determineTier(settings(0, 0, 0, 0))).toBe("free_shipping");
  });

  it("gözlenen dağılım yapılandırılan olasılıklara uyar (ki-kare testi)", () => {
    const expectedPct = { free_shipping: 50, "10_percent": 30, "15_percent": 15, "20_percent": 5 };
    const config = settings(50, 30, 15, 5);
    const N = 60_000;

    const observed: Record<string, number> = {
      free_shipping: 0,
      "10_percent": 0,
      "15_percent": 0,
      "20_percent": 0,
    };

    for (let i = 0; i < N; i++) observed[determineTier(config)] += 1;

    let chiSquare = 0;
    for (const [tier, pct] of Object.entries(expectedPct)) {
      const expectedCount = (pct / 100) * N;
      chiSquare += (observed[tier] - expectedCount) ** 2 / expectedCount;
    }

    // 3 serbestlik derecesi, p=0.001 kritik değeri 16.27.
    // Doğru dağılımda bu eşiğin aşılması binde bir ihtimaldir.
    expect(chiSquare).toBeLessThan(16.27);
  });
});

describe("generateCode", () => {
  it("ödüle göre doğru ön eki kullanır", () => {
    expect(generateCode("free_shipping")).toMatch(/^SCKG-/);
    expect(generateCode("10_percent")).toMatch(/^SC10-/);
    expect(generateCode("15_percent")).toMatch(/^SC15-/);
    expect(generateCode("20_percent")).toMatch(/^SC20-/);
  });

  it("karışabilen karakterler (0/O, 1/I) içermez", () => {
    for (let i = 0; i < 1000; i++) {
      const suffix = generateCode("10_percent").split("-")[1];
      expect(suffix).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("pratikte çakışma üretmez", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 5000; i++) codes.add(generateCode("10_percent"));
    // 32^6 ≈ 1,07 milyar olasılık; 5000 örnekte çakışma beklenmez.
    expect(codes.size).toBe(5000);
  });
});

describe("detectDevice", () => {
  it("mobil, tablet ve masaüstünü ayırt eder", () => {
    expect(
      detectDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("mobile");
    expect(
      detectDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"),
    ).toBe("tablet");
    expect(
      detectDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"),
    ).toBe("desktop");
  });

  it("iPad'i mobil değil tablet olarak sınıflar", () => {
    // iPad user agent'ı hem 'ipad' hem 'mobile' içerebilir; tablet önce kontrol edilmeli.
    expect(detectDevice("Mozilla/5.0 (iPad; CPU OS 16_0) Mobile/15E148")).toBe(
      "tablet",
    );
  });

  it("user agent yoksa bilinmiyor döndürür", () => {
    expect(detectDevice(null)).toBe("unknown");
  });
});

describe("planLimit", () => {
  it("ücretsiz plan aylık 50 gösterimle sınırlıdır", () => {
    expect(planLimit("free")).toBe(50);
  });

  it("ücretli planlar sınırsızdır", () => {
    expect(planLimit("starter")).toBe(Number.MAX_SAFE_INTEGER);
    expect(planLimit("growth")).toBe(Number.MAX_SAFE_INTEGER);
    expect(planLimit("enterprise")).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("bilinmeyen plan adında ücretsiz limite düşer", () => {
    expect(planLimit("bilinmeyen")).toBe(50);
  });
});

describe("addMonths", () => {
  it("fatura dönemini bir ay ileri taşır", () => {
    expect(addMonths(new Date("2026-01-15T10:00:00Z"), 1).getUTCMonth()).toBe(1);
  });

  it("yıl sınırını doğru geçer", () => {
    const next = addMonths(new Date("2026-12-10T00:00:00Z"), 1);
    expect(next.getFullYear()).toBe(2027);
  });

  it("özgün tarihi değiştirmez", () => {
    const original = new Date("2026-03-01T00:00:00Z");
    addMonths(original, 3);
    expect(original.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
});
