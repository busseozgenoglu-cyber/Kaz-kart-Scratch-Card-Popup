import prisma from "~/db.server";

/**
 * Kişisel veri saklama süresi.
 *
 * Kazıma kayıtları ziyaretçiyle ilişkilendirilebilecek alanlar taşır
 * (sepet belirteci, ülke kodu, cihaz türü). Bunlar yalnızca mağazanın
 * dönüşüm raporları için gereklidir ve süresiz tutulmaları gerekmez.
 *
 * `RETENTION_DAYS` sonunda kayıtlar tamamen silinir. Raporlarda kullanılan
 * toplamlar `AnalyticsEvent` tarafında gün bazında tutulduğu için mağaza
 * geçmiş istatistiklerini kaybetmez; silinen yalnızca ziyaretçiye
 * bağlanabilecek satır düzeyi veridir.
 */
export const RETENTION_DAYS = 90;

/** Saklama süresi geçmiş kazıma kayıtlarını siler. Silinen satır sayısını döndürür. */
export async function purgeExpiredScratches(
  shopId?: string,
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.scratch.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      ...(shopId ? { shopId } : {}),
    },
  });

  if (result.count > 0) {
    console.info(
      "[scratchcart] saklama süresi dolan kazıma kayıtları silindi",
      JSON.stringify({ shopId: shopId ?? "tümü", deleted: result.count }),
    );
  }

  return result.count;
}

/**
 * Temizliği en fazla günde bir kez çalıştırır.
 *
 * Panel her açıldığında silme sorgusu atmanın anlamı yok. Son çalıştırma
 * zamanı bellekte tutulur; süreç yeniden başladığında sıfırlanır, bu da
 * yalnızca bir kez fazladan çalıştırma anlamına gelir (zararsız).
 *
 * Hata durumunda sessizce geçilir: saklama temizliği panelin açılmasını
 * engellememeli.
 */
let lastPurgeAt = 0;
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function purgeExpiredScratchesThrottled(): Promise<void> {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;

  try {
    await purgeExpiredScratches();
  } catch (error) {
    console.error(
      "[scratchcart] saklama temizliği başarısız",
      error instanceof Error ? error.message : String(error),
    );
  }
}
