# Baştan sona: sıfırdan App Store başvurusuna

Bu dosya sırayla takip edilecek tek listedir. Ayrıntılar için ilgili adımda
[`DEPLOYMENT.md`](DEPLOYMENT.md) ve [`APP_STORE.md`](APP_STORE.md) dosyalarına
yönlendirilirsiniz.

Toplam süre: ilk yayına alma yaklaşık yarım gün. Shopify incelemesi ayrıca
5–10 iş günü sürer.

---

## Aşama 0 — Hazırlık (15 dk)

- [ ] **Partner hesabı aç:** [partners.shopify.com](https://partners.shopify.com)
- [ ] **App Store kaydı yap:** Partner Dashboard → Settings → App Store
      registration. Tek seferlik 19 USD kayıt ücreti vardır; ödeme almak için
      zorunludur.
- [ ] **Development store oluştur:** Stores → Add store → Development store.
      Test için birkaç ürün ekleyin.
- [ ] **Destek e-postası hazırla.** Başvuruda ve uygulama içinde kullanılacak.

---

## Aşama 1 — Uygulamayı oluştur (10 dk)

- [ ] Partner Dashboard → **Apps** → **Create app** → **Create app manually**
- [ ] Uygulama adını yaz
- [ ] **Client ID** ve **Client secret** değerlerini bir kenara not al

> **İsim uyarısı:** Shopify, uygulama adının işlevin genel bir tarifi olmasına
> izin vermez ve marka adıyla başlamasını ister. Ad 30 karakterin altında
> olmalıdır. Ayrıca alan adında **"shopify" kelimesi geçemez.**

---

## Aşama 2 — Railway'e yayına al (45 dk)

Ayrıntılı anlatım: [`DEPLOYMENT.md`](DEPLOYMENT.md)

- [ ] Railway'de GitHub deposundan yeni proje oluştur
- [ ] **Servis adını dikkatle seç** — içinde "shopify" geçmesin
- [ ] **+ New → Database → PostgreSQL** ekle
- [ ] Ortam değişkenlerini gir:
      `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES`,
      `NODE_ENV=production`
      (`DATABASE_URL` ve `PORT` Railway tarafından sağlanır)
- [ ] Deploy'un yeşil olduğunu doğrula

Veritabanı şeması ilk açılışta otomatik uygulanır (`npm run start` içindeki
`prisma migrate deploy`).

---

## Aşama 3 — Uygulama yapılandırmasını bağla (15 dk)

- [ ] `shopify.app.toml` içinde `client_id`, `application_url`,
      `redirect_urls` ve `[app_proxy]` alanlarını Railway alan adına göre doldur
- [ ] Yerelde:

```bash
npm install
npm run config:link   # Partner Dashboard'daki uygulamaya bağlar
npm run deploy        # yapılandırmayı ve theme extension'ı gönderir
```

---

## Aşama 4 — Test mağazasında doğrula (30 dk)

- [ ] Partner Dashboard → uygulama → **Test your app** → development store seç
- [ ] Kurulum ekranında izinleri onayla
- [ ] Tema düzenleyicide widget'ı aç:
      **Online Store → Themes → Customize → App embeds → aç → Save**

Sonra baştan sona dene:

- [ ] Panel gömülü olarak açılıyor, beş sayfa da yükleniyor
- [ ] Ayarlar kaydediliyor, önizleme değişiyor
- [ ] Sepete ürün ekle, fareyi sayfa üstünden çıkar → bilet açılıyor
- [ ] Kaplama kazınıyor, ödül çıkıyor, indirim sepete işleniyor
- [ ] Shopify yöneticisinde **Discounts** altında kod görünüyor
- [ ] Siparişi tamamla → panelde "kurtarıldı" olarak raporlanıyor
- [ ] Mobil cihazda da dene (tam ekran mod)
- [ ] Uygulamayı kaldır → hata çıkmıyor

Sorun çıkarsa [`DEPLOYMENT.md`](DEPLOYMENT.md) sonundaki tabloya bakın.

---

## Aşama 5 — Yasal sayfalar (5 dk)

Uygulama bu sayfaları kendi içinde barındırır; ayrıca site kurmanız gerekmez:

| Sayfa | URL |
|---|---|
| Gizlilik Politikası | `https://<alan-adınız>/privacy` |
| Hizmet Şartları | `https://<alan-adınız>/terms` |
| Destek | `https://<alan-adınız>/support` |

- [ ] `app/components/LegalPage.tsx` içindeki `COMPANY` bloğunu doldur
      (şirket adı, e-posta, adres)
- [ ] Üç sayfayı tarayıcıda açıp kontrol et

> ⚠️ Bu metinler bir avukat tarafından yazılmamıştır ve hukuki tavsiye değildir.
> Yayına almadan önce bir hukukçuya okutmanız, özellikle KVKK ve tüketici
> mevzuatı açısından, önerilir.

---

## Aşama 6 — Korumalı müşteri verisi başvurusu (15 dk)

`read_orders` kapsamı ayrı onay gerektirir.

- [ ] Partner Dashboard → uygulama → **API access** → **Protected customer data
      access** → başvuruyu doldur
- [ ] Gerekçe metni hazır: [`APP_STORE.md`](APP_STORE.md) içinde

Bu onay gelmeden listeleme yayınlanmaz, o yüzden erken başvurun.

---

## Aşama 7 — Listeleme içeriği (1–2 saat)

Hazır metinler: [`APP_STORE.md`](APP_STORE.md)

- [ ] Uygulama adı ve tagline
- [ ] Kısa ve uzun açıklama (Türkçe + İngilizce)
- [ ] Öne çıkan özellikler
- [ ] Kategori ve anahtar kelimeler
- [ ] Fiyatlandırma tablosu — her planın ne içerdiğini açıkça yaz
- [ ] **Uygulama ikonu:** 1200×1200 px
- [ ] **Ekran görüntüleri:** en az 3 adet, 1600×900 px
- [ ] Gizlilik, şartlar ve destek URL'leri (Aşama 5)
- [ ] Demo mağaza bağlantısı (inceleme ekibi buradan test eder)

---

## Aşama 8 — Son kontrol ve gönderim

```bash
npm run typecheck   # tip hatası yok
npm test            # birim testleri
node e2e/run.js     # uçtan uca tarayıcı testi
npm run build       # üretim derlemesi
npm run deploy      # extension'lar güncel
```

- [ ] [`APP_STORE.md`](APP_STORE.md) kontrol listesindeki tüm maddeler tamam
- [ ] Başvuru ekranındaki **AI self review** adımını çalıştır ve bulguları gider
- [ ] Partner Dashboard → **Distribution** → **Shopify App Store** → gönder

---

## Sonrası

- İlk yanıt genelde 5–10 iş günü içinde gelir.
- Ret gelirse gerekçe ayrıntılı yazılır; düzeltip yeniden gönderebilirsiniz.
- En sık ret sebepleri: alan adı politikası, jenerik uygulama adı, eksik
  gizlilik politikası, GDPR webhook'larının yanıt vermemesi, kurulumda hata.
- Yayına girdikten sonra izlenecek en kritik metrik: **kazanma isteklerinin
  başarı oranı.** Düşerse müşteriler ödül görüp indirim alamıyor demektir.
