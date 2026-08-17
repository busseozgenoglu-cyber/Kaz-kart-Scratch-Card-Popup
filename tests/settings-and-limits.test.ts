import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/db.server", () => ({ default: {} }));

const { clientKey, rateLimit } = await import("~/lib/rate-limit.server");
const { parseSettingsForm } = await import("~/lib/shop.server");

/** Testler arası sayaç sızmasını önlemek için her seferinde farklı anahtar. */
let counter = 0;
const key = () => `test-key-${counter++}`;

describe("rateLimit", () => {
  afterEach(() => vi.useRealTimers());

  it("limit dolana kadar istekleri geçirir", () => {
    const k = key();
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(k, 5, 60_000).allowed).toBe(true);
    }
  });

  it("limit aşıldığında engeller", () => {
    const k = key();
    for (let i = 0; i < 3; i++) rateLimit(k, 3, 60_000);
    expect(rateLimit(k, 3, 60_000).allowed).toBe(false);
  });

  it("kalan hak sayısını doğru bildirir", () => {
    const k = key();
    expect(rateLimit(k, 3, 60_000).remaining).toBe(2);
    expect(rateLimit(k, 3, 60_000).remaining).toBe(1);
    expect(rateLimit(k, 3, 60_000).remaining).toBe(0);
  });

  it("engellendiğinde saniye cinsinden bekleme süresi verir", () => {
    const k = key();
    rateLimit(k, 1, 30_000);
    const blocked = rateLimit(k, 1, 30_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(30);
  });

  it("pencere dolduğunda sayaç sıfırlanır", () => {
    vi.useFakeTimers();
    const k = key();
    rateLimit(k, 1, 1000);
    expect(rateLimit(k, 1, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1500);
    expect(rateLimit(k, 1, 1000).allowed).toBe(true);
  });

  it("farklı anahtarlar birbirinin kotasını tüketmez", () => {
    const a = key();
    const b = key();
    rateLimit(a, 1, 60_000);
    expect(rateLimit(a, 1, 60_000).allowed).toBe(false);
    // Başka bir mağaza/IP hâlâ hizmet alabilmeli.
    expect(rateLimit(b, 1, 60_000).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers });

  it("proxy zincirindeki ilk IP'yi kullanır", () => {
    const k = clientKey(
      req({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" }),
      "magaza.myshopify.com",
      "win",
    );
    expect(k).toBe("win:magaza.myshopify.com:203.0.113.5");
  });

  it("Cloudflare başlığına geri düşer", () => {
    const k = clientKey(
      req({ "cf-connecting-ip": "198.51.100.7" }),
      "magaza.myshopify.com",
      "start",
    );
    expect(k).toContain("198.51.100.7");
  });

  it("IP yoksa da anahtar üretir (istek düşürülmez)", () => {
    expect(clientKey(req({}), "magaza.myshopify.com", "win")).toBe(
      "win:magaza.myshopify.com:unknown",
    );
  });

  it("aynı IP farklı mağazalarda ayrı sayılır", () => {
    const headers = { "x-forwarded-for": "203.0.113.5" };
    expect(clientKey(req(headers), "a.myshopify.com", "win")).not.toBe(
      clientKey(req(headers), "b.myshopify.com", "win"),
    );
  });
});

/** Geçerli bir ayar formu üretir; testler yalnızca ilgilendikleri alanı bozar. */
function form(overrides: Record<string, string> = {}) {
  const base: Record<string, string> = {
    enabled: "true",
    triggerType: "both",
    inactivitySeconds: "90",
    maxDisplaysPerSession: "1",
    cooldownMinutes: "60",
    title: "SİZE ÖZEL HEDİYE",
    subtitle: "Kazı, hediyeni gör",
    scratchText: "KAZI",
    backgroundColor: "#0B0A12",
    cardColor: "#D8BE8D",
    revealColor: "#E8C88A",
    textColor: "#141126",
    fontFamily: "system",
    tierFreeShippingProb: "50",
    tier10PercentProb: "30",
    tier15PercentProb: "15",
    tier20PercentProb: "5",
    freeShippingThreshold: "150",
    minCartValue: "50",
    discountValidMinutes: "30",
    autoApply: "true",
    showConfetti: "true",
    enableHaptic: "true",
    mobileFullScreen: "true",
    language: "tr",
  };

  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    fd.set(k, v);
  }
  return fd;
}

describe("parseSettingsForm", () => {
  it("geçerli formu hatasız kabul eder", () => {
    const { errors, data } = parseSettingsForm(form());
    expect(errors).toEqual({});
    expect(data.title).toBe("SİZE ÖZEL HEDİYE");
    expect(data.language).toBe("tr");
  });

  it("satıcının yazdığı indirim oranlarını kaydeder", () => {
    const { errors, data } = parseSettingsForm(
      form({
        tier10PercentValue: "7",
        tier15PercentValue: "22",
        tier20PercentValue: "35",
      }),
    );
    expect(errors).toEqual({});
    expect(data.tier10PercentValue).toBe(7);
    expect(data.tier15PercentValue).toBe(22);
    expect(data.tier20PercentValue).toBe(35);
  });

  it("indirim oranı alanı gönderilmezse varsayılanı korur", () => {
    // Alan formda hiç yoksa "0 girildi" sayılmamalı.
    const { errors, data } = parseSettingsForm(form());
    expect(errors.tier10PercentValue).toBeUndefined();
    expect(data.tier10PercentValue).toBe(10);
    expect(data.tier15PercentValue).toBe(15);
    expect(data.tier20PercentValue).toBe(20);
  });

  it("aralık dışındaki indirim oranını reddeder", () => {
    const { errors } = parseSettingsForm(form({ tier10PercentValue: "0" }));
    expect(errors.tier10PercentValue).toBeTruthy();
    const tooHigh = parseSettingsForm(form({ tier20PercentValue: "150" }));
    expect(tooHigh.errors.tier20PercentValue).toBeTruthy();
  });

  it("ödül oranları 100 etmiyorsa reddeder", () => {
    const { errors } = parseSettingsForm(form({ tier20PercentProb: "20" }));
    expect(errors.probabilities).toBeTruthy();
    expect(errors.probabilities).toContain("115");
  });

  it("geçersiz renk kodunu reddeder", () => {
    const { errors } = parseSettingsForm(form({ revealColor: "altın" }));
    expect(errors.revealColor).toBeTruthy();
  });

  it("kısa hex rengi kabul eder", () => {
    const { errors } = parseSettingsForm(form({ cardColor: "#abc" }));
    expect(errors.cardColor).toBeUndefined();
  });

  it("boş başlığı reddeder", () => {
    const { errors } = parseSettingsForm(form({ title: "   " }));
    expect(errors.title).toBeTruthy();
  });

  it("çok uzun kazıma yazısını reddeder", () => {
    const { errors } = parseSettingsForm(form({ scratchText: "ÇOK UZUN BİR KAZIMA YAZISI" }));
    expect(errors.scratchText).toBeTruthy();
  });

  it("desteklenmeyen dili reddeder", () => {
    const { errors } = parseSettingsForm(form({ language: "de" }));
    expect(errors.language).toBeTruthy();
  });

  it("geçersiz tetikleme türünü reddeder", () => {
    const { errors } = parseSettingsForm(form({ triggerType: "rastgele" }));
    expect(errors.triggerType).toBeTruthy();
  });

  it("hareketsizlik süresini güvenli aralığa sıkıştırır", () => {
    // Kullanıcı 5 saniye yazsa bile widget anında açılıp müşteriyi rahatsız etmemeli.
    expect(parseSettingsForm(form({ inactivitySeconds: "5" })).data.inactivitySeconds).toBe(15);
    expect(parseSettingsForm(form({ inactivitySeconds: "9999" })).data.inactivitySeconds).toBe(600);
  });

  it("oturum başına gösterimi 1–5 aralığında tutar", () => {
    expect(parseSettingsForm(form({ maxDisplaysPerSession: "0" })).data.maxDisplaysPerSession).toBe(1);
    expect(parseSettingsForm(form({ maxDisplaysPerSession: "50" })).data.maxDisplaysPerSession).toBe(5);
  });

  it("indirim geçerlilik süresini 5 dakika ile 1 gün arasında tutar", () => {
    expect(parseSettingsForm(form({ discountValidMinutes: "1" })).data.discountValidMinutes).toBe(5);
    expect(parseSettingsForm(form({ discountValidMinutes: "99999" })).data.discountValidMinutes).toBe(1440);
  });

  it("sayısal olmayan girdide varsayılana döner", () => {
    expect(parseSettingsForm(form({ cooldownMinutes: "abc" })).data.cooldownMinutes).toBe(60);
  });

  it("negatif sepet eşiğini sıfıra çeker", () => {
    expect(Number(parseSettingsForm(form({ minCartValue: "-100" })).data.minCartValue)).toBe(0);
  });

  it("kapatılan anahtarları false olarak okur", () => {
    const { data } = parseSettingsForm(form({ enabled: "false", showConfetti: "false" }));
    expect(data.enabled).toBe(false);
    expect(data.showConfetti).toBe(false);
  });
});
