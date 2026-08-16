# Shopify App Store Başvuru Rehberi

Bu doküman başvuru öncesi kontrol listesi ve hazır liste metinlerini içerir.

---

## Teknik kontrol listesi

### Zorunlu — bunlar olmadan başvuru reddedilir

- [x] **GDPR webhook'ları** uygulanmış: `customers/data_request`, `customers/redact`, `shop/redact`
- [x] **`app/uninstalled` webhook'u** mağaza verisini temizliyor
- [x] **Webhook HMAC doğrulaması** (Shopify Remix paketi otomatik yapar)
- [x] **App Proxy imza doğrulaması** her vitrin isteğinde
- [x] **OAuth** resmi Shopify Remix akışıyla
- [x] **Gömülü (embedded) uygulama** App Bridge ile
- [x] **Billing API** entegrasyonu (`appSubscriptionCreate`)
- [ ] **Alan adında "shopify" kelimesi geçmiyor** ← Railway servis adını doğrula
- [ ] **Gizlilik Politikası URL'si** canlı ve erişilebilir
- [ ] **Hizmet Şartları URL'si** canlı ve erişilebilir
- [ ] **Destek e-postası** çalışıyor

### Performans ve kalite

- [x] Widget JS'i asenkron yükleniyor, ödeme sayfasında çalışmıyor
- [x] Widget yalnızca sepette ürün varken yükleniyor
- [x] Polaris tasarım sistemi kullanılmış (tutarlı yönetici deneyimi)
- [x] Boş durum (empty state) ekranları var
- [x] Hata durumları kullanıcıya anlamlı mesaj gösteriyor
- [x] Mobil uyumlu (dokunma olayları, tam ekran mod)
- [x] Türkçe ve İngilizce desteği (ayrıca İspanyolca)

### Veri ve güvenlik

- [x] Kişisel veri minimumda tutuluyor
- [x] Süresi geçmiş indirim kodları temizleniyor
- [x] Hız sınırlama uygulanmış
- [x] İndirim kodları tek kullanımlık ve süreli

---

## Protected customer data başvurusu

`read_orders` kapsamı **korumalı müşteri verisi** sayılır ve ayrı onay gerektirir.

Partner Dashboard → uygulama → **API access** → **Protected customer data access** bölümünden başvurun.

**Gerekçe metni (kopyalanabilir):**

> ScratchCart uses order data solely to attribute recovered carts. When an order is created, the app matches the order's discount codes against the codes it generated. Only the matched order ID and total value are stored, and only for orders that used a ScratchCart discount code. No customer names, email addresses, phone numbers, or shipping addresses are read, stored, or transmitted. This attribution is the core value the app reports to merchants: how much revenue the scratch card actually recovered.

**Veri saklama beyanı:**

| Veri | Saklanan | Süre |
|---|---|---|
| Kazıma olayları | Anonim oturum kimliği, cihaz türü, sepet tutarı | 90 gün |
| İndirim kodları | Kod, kademe, son kullanma | Kullanım/bitiş + 30 gün |
| Sipariş eşleşmesi | Sipariş kimliği, tutar | Toplu istatistik olarak |
| Mağaza ayarları | Tasarım ve olasılık ayarları | Kurulum süresince |

Uygulama kaldırıldığında mağaza verisi `app/uninstalled` webhook'unda temizlenir.

---

## Uygulama listesi metinleri

### Uygulama adı
```
ScratchCart
```

### Tagline (Türkçe)
```
Sepet terk eden müşterilerinizi kazı kazan ile geri kazanın
```

### Tagline (English)
```
Win back abandoning carts with a scratch-to-reveal discount
```

### Kısa açıklama (Türkçe)

```
Müşteriniz sepeti terk etmek üzereyken ekranda bir kazı kazan bileti belirir.
Kazır, ödülünü görür ve indirim anında sepetine işlenir. E-posta beklemek yok,
kod kopyalamak yok — müşteri zaten sitedeyken karar verir.

Kargo bedava, %10, %15 ve %20 ödüllerinin çıkma oranlarını siz belirlersiniz.
Her kod tek kullanımlıktır, süresi doludur ve yalnızca o müşteri için üretilir.
Panelde kaç sepetin gerçekten kurtarıldığını ve ne kadar gelir getirdiğini
sipariş bazında görürsünüz.
```

### Kısa açıklama (English)

```
When a shopper is about to leave with items in their cart, a scratch card
appears. They scratch, reveal a reward, and the discount is applied to their
cart instantly. No emails to wait for, no codes to copy — they decide while
they are still on your store.

You control how often free shipping, 10%, 15% and 20% appear. Every code is
single-use, time-limited, and generated for that shopper only. The dashboard
shows how many carts were actually recovered and how much revenue they brought
in, matched order by order.
```

### Öne çıkan özellikler

**Türkçe:**
```
• Çıkış niyeti ve hareketsizlik tetikleyicileri
• İndirim sepete otomatik işlenir — kod kopyalama yok
• Ödül oranlarını tamamen siz belirlersiniz
• Tek kullanımlık, süreli indirim kodları
• Gerçek gelir raporlaması — sipariş bazında eşleştirme
• Bilet tasarımını mağazanıza göre özelleştirin
• Mobil uyumlu, dokunmatik kazıma
• Türkçe, İngilizce ve İspanyolca
```

**English:**
```
• Exit-intent and inactivity triggers
• Discount applies to the cart automatically — no code copying
• You set the odds for every reward tier
• Single-use, time-limited discount codes
• Real revenue reporting — matched order by order
• Customize the ticket design to fit your store
• Mobile-ready with touch scratching
• Turkish, English and Spanish
```

### Kategori
```
Birincil: Marketing and conversion
İkincil:  Cart recovery / Discounts
```

### Anahtar kelimeler
```
cart recovery, exit intent, scratch card, discount, gamification,
abandoned cart, conversion, sepet kurtarma, kazı kazan, indirim
```

---

## Görsel varlıklar

| Varlık | Boyut | Durum |
|---|---|---|
| Uygulama ikonu | 1200×1200 px, PNG | ⬜ Hazırlanacak |
| Ekran görüntüsü 1 — Panel genel bakış | 1600×900 px | ⬜ |
| Ekran görüntüsü 2 — Vitrinde bilet | 1600×900 px | ⬜ |
| Ekran görüntüsü 3 — Kazıma anı / ödül | 1600×900 px | ⬜ |
| Ekran görüntüsü 4 — Raporlar | 1600×900 px | ⬜ |
| Ekran görüntüsü 5 — Mobil görünüm | 1600×900 px | ⬜ |

**Ekran görüntüsü ipuçları:**
- Gerçek verilerle doldurun; boş panel ekran görüntüsü başvuruyu zayıflatır
- Sahte/abartılı rakamlar kullanmayın (inceleme ekibi fark eder)
- Her görselin üstüne kısa bir açıklama şeridi ekleyin
- Mobil görüntüyü gerçek cihaz çerçevesinde gösterin

---

## Fiyatlandırma

| Plan | Fiyat | Aylık gösterim | Ödül sayısı | Deneme |
|---|---|---|---|---|
| Ücretsiz | $0 | 50 | 2 | — |
| Starter | $19/ay | Sınırsız | 4 | 7 gün |
| Growth | $39/ay | Sınırsız | 4 + kural motoru | 15 gün |
| Enterprise | $79/ay | Sınırsız | Özel | 15 gün |

Listeleme formunda **her planın ne içerdiğini** açıkça yazın. Shopify, plan farklarının belirsiz olduğu başvuruları geri çevirir.

---

## AI self review

Başvuru ekranındaki **"Run AI self review"** adımı için:

1. Shopify AI Toolkit'i kurun (başvuru sayfasındaki bağlantıdan)
2. `/shopify-app-store-review` komutunu **AI asistanın sohbet kutusuna** yazın — terminale değil
3. Çıkan bulguları giderin
4. **"I've reviewed all the App Store Requirements"** kutusunu işaretleyin

---

## İnceleme sürecinde beklenenler

- İlk yanıt genelde **5–10 iş günü** içinde gelir
- İnceleme ekibi uygulamayı kendi test mağazasına kurar; **kurulum akışının kusursuz olması** en kritik noktadır
- Reddedilme durumunda gerekçe ayrıntılı yazılır; düzeltip yeniden gönderebilirsiniz
- En sık ret sebepleri: alan adı politikası, eksik gizlilik politikası, GDPR webhook'larının yanıt vermemesi, kurulumda hata

---

## Başvuru öncesi son kontrol

```bash
npm run typecheck   # tip hatası yok
npm test            # tüm testler geçiyor
npm run build       # üretim derlemesi başarılı
npm run deploy      # extension'lar güncel
```

Ardından test mağazasında [`DEPLOYMENT.md`](DEPLOYMENT.md) içindeki uçtan uca doğrulama listesini baştan sona geçin.
