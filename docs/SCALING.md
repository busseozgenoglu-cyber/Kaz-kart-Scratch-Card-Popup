# Ölçeklendirme Notları

Uygulamanın mevcut hâli tek instance için tasarlanmıştır ve binlerce mağazayı rahatça taşır. Bu doküman, büyüdükçe hangi noktaların değişmesi gerektiğini anlatır.

---

## 1. Hız sınırlama (tek instance varsayımı)

`app/lib/rate-limit.server.ts` sayaçları **süreç belleğinde** tutar. Birden fazla replica çalıştırırsanız her replica kendi sayacını tutar ve gerçek limit replica sayısıyla çarpılır.

**Ne zaman sorun olur:** Railway'de replica sayısını 1'in üzerine çıkardığınızda.

**Çözüm:** Redis tabanlı sayaca geçin.

```ts
// Kavramsal örnek — mevcut rateLimit() imzasını koruyun
const count = await redis.incr(key);
if (count === 1) await redis.pexpire(key, windowMs);
return { allowed: count <= limit, /* ... */ };
```

Mevcut fonksiyon imzası (`key`, `limit`, `windowMs`) senkron olduğu için çağıran rotaların `await` eklemesi gerekir — dört proxy rotası etkilenir.

---

## 2. Veritabanı

### İndeksler

Şema, sık kullanılan sorgular için indekslenmiştir. Kazıma tablosu en hızlı büyüyen tablodur; sorgu planlarını düzenli kontrol edin:

```sql
EXPLAIN ANALYZE
SELECT * FROM "Scratch"
WHERE "shopId" = '...' ORDER BY "createdAt" DESC LIMIT 50;
```

### Veri saklama

`Scratch` kayıtları 90 gün sonra arşivlenmelidir. Bu iş şu an otomatik değildir; büyüdüğünüzde bir cron ekleyin:

```sql
DELETE FROM "Scratch"
WHERE "createdAt" < NOW() - INTERVAL '90 days'
  AND "convertedToOrder" = false;
```

Dönüştürülen kayıtları silmeyin — gelir raporlaması onlara dayanır. Alternatif olarak günlük `Analytics` tablosuna toplayıp ham kayıtları silin.

### Bağlantı havuzu

Prisma varsayılan havuzu çoğu yük için yeterlidir. Railway PostgreSQL'in bağlantı limitine yaklaşırsanız `DATABASE_URL` sonuna ekleyin:

```
?connection_limit=10&pool_timeout=20
```

---

## 3. Shopify API limitleri

Admin GraphQL API maliyet tabanlı bir limite tabidir. Her kazanma olayı **bir** indirim mutation'ı çalıştırır — bu ucuzdur, ancak tek bir mağazada ani trafik artışında limite takılabilirsiniz.

**İzlenecek:** `discountCodeBasicCreate` yanıtlarında `THROTTLED` hatası.

**Çözüm:** Üstel geri çekilmeli (exponential backoff) yeniden deneme ekleyin. Kazanma akışı kullanıcıyı beklettiği için en fazla 2 deneme ve toplam 3 saniye sınırı önerilir; başarısız olursa müşteriye anlamlı bir hata gösterin.

---

## 4. İndirim kodu temizliği

`cleanupExpiredCodes()` süresi geçmiş kullanılmamış kodları siler ancak **otomatik tetiklenmez**. Mağaza başına indirim listesinin şişmemesi App Store incelemesinde önemlidir.

**Öneri:** Günlük bir cron ile mağaza başına çağırın, veya panel her açıldığında düşük olasılıkla (%5) tetikleyin.

---

## 5. Widget performansı

| Ölçüt | Hedef | Mevcut |
|---|---|---|
| Widget JS (gzip) | < 50 KB | ✅ Vanilla JS, bağımlılık yok |
| Kazıma animasyonu | 60 fps | ✅ Canvas 2D, DPR sınırlı 2x |
| Proxy yanıtı (P95) | < 200 ms | Veritabanı gecikmesine bağlı |
| Panel ilk yükleme | < 3 sn | ✅ |

Widget yalnızca sepette ürün varken yüklenir ve CSS gecikmeli (`media="print"` → `onload`) getirilir; sepeti boş ziyaretçilerin sayfa hızını hiç etkilemez.

---

## 6. Gözlemlenebilirlik

Şu an hata kaydı `console.error` ile yapılır ve Railway loglarına düşer. Büyüdüğünüzde eklemeye değer:

- **Sentry** — hata izleme, özellikle indirim üretim hataları
- **Yapılandırılmış log** (JSON) — mağaza alan adı ve olay türüyle
- **Uyarı**: `DiscountError` oranı ani yükselirse haber veren bir alarm

En kritik metrik: **kazanma isteklerinin başarı oranı**. Bu düşerse müşteriler ödül görüp indirim alamıyor demektir ve bu doğrudan satış kaybıdır.
