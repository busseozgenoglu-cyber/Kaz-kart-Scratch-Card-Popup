import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Saklama süresi, gizlilik politikasında verilen 90 gün taahhüdüyle birebir
 * aynı olmalı. Politika ile kodun ayrışması uyum beyanını geçersiz kılar,
 * bu yüzden süre burada sabitleniyor.
 */

const deleteMany = vi.fn();

vi.mock("~/db.server", () => ({
  default: { scratch: { deleteMany } },
}));

const { RETENTION_DAYS, purgeExpiredScratches } = await import(
  "~/lib/retention.server"
);

beforeEach(() => {
  deleteMany.mockReset();
  deleteMany.mockResolvedValue({ count: 0 });
});

describe("saklama süresi", () => {
  it("gizlilik politikasındaki 90 günle aynıdır", () => {
    expect(RETENTION_DAYS).toBe(90);
  });

  it("kesme tarihini 90 gün öncesine ayarlar", async () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    await purgeExpiredScratches(undefined, now);

    const where = deleteMany.mock.calls[0][0].where;
    const cutoff = where.createdAt.lt as Date;
    const days = (now.getTime() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(90);
  });

  it("mağaza verilmezse tüm mağazaları kapsar", async () => {
    await purgeExpiredScratches();
    expect(deleteMany.mock.calls[0][0].where.shopId).toBeUndefined();
  });

  it("mağaza verilirse yalnızca o mağazayı siler", async () => {
    await purgeExpiredScratches("shop_1");
    expect(deleteMany.mock.calls[0][0].where.shopId).toBe("shop_1");
  });

  it("silinen satır sayısını döndürür", async () => {
    deleteMany.mockResolvedValue({ count: 7 });
    await expect(purgeExpiredScratches()).resolves.toBe(7);
  });
});
