# ScratchCart

**Sepet terk eden müşterilerinizi kazı kazan ile geri kazanın.**

Müşteri sepeti terk etmek üzereyken (çıkış niyeti veya hareketsizlik) ekranda dijital bir kazı kazan bileti belirir. Müşteri gümüş kaplamayı kazır, ödülü görür ve indirim **otomatik olarak sepete işlenir**. E-posta yok, SMS yok, kod kopyalama yok.

Shopify Remix (resmi şablon) üzerine kurulu, gömülü (embedded) bir Shopify Public App'tir.

---

## İçindekiler

- [Hızlı başlangıç](#hızlı-başlangıç)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Mimari](#mimari)
- [Proje yapısı](#proje-yapısı)
- [Komutlar](#komutlar)
- [Nasıl çalışır](#nasıl-çalışır)
- [Güvenlik notları](#güvenlik-notları)
- [Diğer dokümanlar](#diğer-dokümanlar)

---

## Hızlı başlangıç

```bash
# 1. Bağımlılıklar
npm install

# 2. Partner Dashboard'daki uygulamaya bağla (client_id otomatik dolar)
npm run config:link

# 3. Ortam değişkenleri
cp .env.example .env
#    .env dosyasını doldurun (aşağıdaki tabloya bakın)

# 4. Veritabanı şemasını uygula
npx prisma migrate deploy

# 5. Geliştirme
npm run dev
```

`npm run dev` Shopify CLI'yi başlatır, bir tünel açar ve uygulama URL'lerini otomatik günceller.

> **Not:** Uygulama PostgreSQL gerektirir. Yerelde hızlıca bir tane ayağa kaldırmak için:
> `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=scratch -e POSTGRES_DB=scratchcart postgres:16`

---

## Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `SHOPIFY_API_KEY` | Evet | Partner Dashboard → uygulama → API key |
| `SHOPIFY_API_SECRET` | Evet | API secret. App proxy imza doğrulaması da bunu kullanır. |
| `SHOPIFY_APP_URL` | Evet | Uygulamanın herkese açık HTTPS adresi |
| `SCOPES` | Evet | `read_products,read_orders,write_discounts,read_discounts` |
| `DATABASE_URL` | Evet | PostgreSQL bağlantı dizesi (Railway eklentisi otomatik sağlar) |
| `PORT` | Hayır | Varsayılan `3000` |
| `NODE_ENV` | Hayır | Üretimde `production` |

`.env` dosyası **asla** depoya eklenmez (`.gitignore` içinde).

---

## Mimari

```
                    Mağaza vitrini (müşteri tarayıcısı)
                                 │
                    scratchcart.js  (Vanilla JS, Canvas)
                                 │
                    /apps/scratchcart/*   ← Shopify App Proxy
                                 │  (Shopify imzalar, biz doğrularız)
                                 ▼
   ┌──────────────────────────────────────────────────────┐
   │  Remix uygulaması (Node 20)                          │
   │                                                       │
   │  /proxy/config   → bilet ayarları + ödül etiketleri   │
   │  /proxy/start    → gösterim kaydı                     │
   │  /proxy/win      → ÇEKİLİŞ + indirim kodu üretimi     │
   │  /proxy/abandon  → kazımadan kapatma kaydı            │
   │                                                       │
   │  /app/*          → Polaris admin paneli               │
   │  /webhooks/*     → sipariş, kaldırma, GDPR            │
   └──────────────────────────────────────────────────────┘
                    │                          │
              PostgreSQL                Shopify Admin
              (Prisma)                  GraphQL API
```

**Kritik tasarım kararı:** Çekiliş **yalnızca sunucuda** (`/proxy/win`) yapılır. İstemci hangi ödülün çıkacağını önceden bilemez, değiştiremez veya tekrar deneyerek daha iyi ödül arayamaz. Kazıma animasyonu tamamen görseldir; sonucu belirlemez.

---

## Proje yapısı

```
app/
  lib/
    tiers.ts                 # Saf ödül tanımları (istemci + sunucu)
    plans.ts                 # Saf plan tanımları (istemci + sunucu)
    scratch-engine.server.ts # Çekiliş, kota, kod üretimi
    discount.server.ts       # Shopify indirim GraphQL mutation'ları
    analytics.server.ts      # Günlük toplama, metrikler, ROI
    billing.server.ts        # Abonelik ↔ veritabanı senkronizasyonu
    shop.server.ts           # Mağaza kurulumu, ayar doğrulama
    rate-limit.server.ts     # Bellek içi hız sınırlayıcı
    cors.server.ts           # JSON yanıt yardımcıları
  routes/
    app.*.tsx                # Polaris admin paneli
    proxy.*.tsx              # Mağaza vitrini API'si (App Proxy)
    webhooks.*.tsx           # Webhook işleyicileri
  components/
    TicketPreview.tsx        # Panelde canlı bilet önizlemesi
    Charts.tsx               # Bağımlılıksız SVG grafikler
extensions/
  scratchcart-widget/        # Theme App Extension (App Embed)
    assets/scratchcart.js    # Widget (Vanilla JS + Canvas)
    assets/scratchcart.css
    blocks/scratchcart.liquid
prisma/
  schema.prisma
  migrations/                # Başlangıç migration'ı dahil
tests/                       # Vitest (67 test)
docs/                        # Dağıtım ve App Store rehberleri
```

### `.server` dosyaları hakkında önemli kural

Remix, bir React bileşeninin import ettiği her şeyi tarayıcı paketine dahil etmeye çalışır. Prisma import eden bir `.server.ts` dosyasından bileşen içinde fonksiyon çağırırsanız build şu hatayla durur:

```
Server-only module referenced by client
```

Bu yüzden **etiket/isim/sabit gibi saf değerler** `tiers.ts` ve `plans.ts` içinde tutulur (bunlarda `.server` eki yoktur). Bileşenlerde bunları kullanın:

```ts
// ✅ Doğru — bileşen içinde
import { tierLabel } from "~/lib/tiers";
import { planByKey } from "~/lib/plans";

// ❌ Yanlış — build'i kırar
import { tierLabel } from "~/lib/scratch-engine.server";
```

`loader` ve `action` içinde `.server` dosyalarını serbestçe kullanabilirsiniz; Remix o kodu tarayıcıya göndermez.

---

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Shopify CLI ile geliştirme sunucusu + tünel |
| `npm run build` | Üretim derlemesi (`prisma generate` + Remix build) |
| `npm run start` | `prisma migrate deploy` + üretim sunucusu |
| `npm test` | Vitest test paketi |
| `npm run test:watch` | Testleri izleme modunda çalıştır |
| `npm run typecheck` | TypeScript tip kontrolü |
| `npm run lint` | ESLint |
| `npm run deploy` | Uygulama yapılandırmasını ve extension'ları Shopify'a gönder |
| `npm run config:link` | Partner Dashboard'daki uygulamaya bağla |

---

## Nasıl çalışır

### 1. Tetikleme
Widget yalnızca sepette ürün varken yüklenir (Liquid tarafında `cart.item_count > 0` kontrolü). Ardından ayarlara göre:

- **Çıkış niyeti:** İmleç sayfanın üst kenarından çıktığında (`mouseleave`, `y < 10`)
- **Hareketsizlik:** Yapılandırılan süre boyunca (varsayılan 90 sn) etkileşim yoksa
- **Her ikisi:** İkisinden hangisi önce gerçekleşirse

Oturum başına gösterim sayısı ve bekleme süresi (cooldown) panelden ayarlanır.

### 2. Çekiliş
Müşteri kaplamanın **%40'ını** kazıdığında istemci `/proxy/win` uç noktasına istek atar. Sunucu:

1. App Proxy imzasını doğrular (Shopify'ın imzaladığı istek)
2. Hız sınırını kontrol eder (dakikada 8 istek / IP / mağaza)
3. Sepet tutarını **yeniden** doğrular (istemciye güvenilmez)
4. Bu oturum daha önce kazandıysa **aynı kodu** döndürür (çift üretim yok)
5. Aylık kotayı kontrol eder
6. `crypto.randomInt` ile ağırlıklı çekiliş yapar
7. Shopify'da tek kullanımlık, süreli bir indirim kodu oluşturur
8. Kodu veritabanına yazar ve istemciye döndürür

### 3. Uygulama
İstemci kodu Shopify'ın kendi sepet uç noktasına gönderir; indirim sepete işlenir ve müşteri ödemeye devam eder.

### 4. Dönüşüm takibi
`orders/create` webhook'u gelen siparişteki indirim kodlarını veritabanındaki kodlarla eşleştirir. Eşleşme varsa ilgili kazıma olayı "kurtarıldı" olarak işaretlenir ve panelde gerçek gelir olarak raporlanır.

### Ödül kademeleri

| Kademe | Varsayılan olasılık | Kod ön eki | Shopify mutation |
|---|---|---|---|
| Kargo bedava | %50 | `SCKG-` | `discountCodeFreeShippingCreate` |
| %10 indirim | %30 | `SC10-` | `discountCodeBasicCreate` |
| %15 indirim | %15 | `SC15-` | `discountCodeBasicCreate` |
| %20 indirim | %5 | `SC20-` | `discountCodeBasicCreate` |

Olasılıkların toplamı **tam 100** olmalıdır; panel ve API bunu birlikte doğrular.

> **Spec'ten sapma (kasıtlı):** Orijinal teknik şartname `discountCodeAppCreate` kullanıyordu. O mutation yalnızca uygulamanın bir Shopify Discount **Function** extension'ı varsa çalışır ve `functionId` ister. ScratchCart yüzde ve kargo indirimi dağıttığı için Shopify'ın yerleşik mutation'ları doğru seçimdir — bu sayede ek bir function deploy'u gerekmez.

---

## Güvenlik notları

- **App Proxy imza doğrulaması** her vitrin isteğinde yapılır (`authenticate.public.appProxy`)
- **Çekiliş sunucu tarafındadır**; istemci sonucu etkileyemez
- **`crypto.randomInt`** kullanılır, `Math.random()` değil — modulo sapması yoktur ve tahmin edilemez
- **Hız sınırlama** kod üretim uç noktasında zorunludur
- **Tek kullanımlık kodlar**: `usageLimit: 1`, `appliesOncePerCustomer: true`, süreli
- **Oturum tekrarı engeli**: aynı oturum ikinci kez kod alamaz
- **Sepet tutarı sunucuda yeniden doğrulanır**
- **Süresi geçmiş kullanılmamış kodlar temizlenir** — mağazanın indirim listesi şişmez
- **GDPR webhook'ları** (`customers/data_request`, `customers/redact`, `shop/redact`) uygulanmıştır

---

## Diğer dokümanlar

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Railway'e dağıtım, adım adım
- [`docs/APP_STORE.md`](docs/APP_STORE.md) — App Store başvuru kontrol listesi ve liste metinleri
- [`docs/SCALING.md`](docs/SCALING.md) — Çoklu replica, Redis, performans

---

## Lisans

Özel (proprietary). Ganz Dijital.
