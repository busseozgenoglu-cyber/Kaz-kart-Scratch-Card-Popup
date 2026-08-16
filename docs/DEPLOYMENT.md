# Dağıtım Rehberi (Railway)

Bu rehber ScratchCart'ı sıfırdan canlıya almanın tam yolunu anlatır.

---

## ⚠️ Önce oku: alan adı kuralı

Shopify, uygulama alan adında **"shopify" kelimesinin geçmesine izin vermez**. Marka politikası ihlali sayılır ve başvuru reddedilir.

```
❌ scratchcart-shopify.up.railway.app
❌ shopify-scratchcart-production.up.railway.app
✅ scratchcart.up.railway.app
✅ scratchcart-app.up.railway.app
✅ app.scratchcart.com
```

Railway servis adını **oluştururken** doğru koyun; sonradan değiştirmek `application_url`, `redirect_urls` ve app proxy ayarlarının hepsini güncellemeyi gerektirir.

---

## 1. Partner Dashboard'da uygulamayı oluştur

1. [partners.shopify.com](https://partners.shopify.com) → **Apps** → **Create app** → **Create app manually**
2. Uygulama adı: `ScratchCart`
3. Oluştuktan sonra **Client ID** ve **Client secret** değerlerini not alın

---

## 2. Railway projesini kur

1. Railway'de yeni proje → **Deploy from GitHub repo**
2. Servis adını dikkatle seçin (yukarıdaki alan adı kuralı!)
3. **+ New** → **Database** → **PostgreSQL** ekleyin

PostgreSQL eklendiğinde Railway `DATABASE_URL` değişkenini otomatik sağlar. Uygulama servisinizde bu değişkenin göründüğünü doğrulayın; görünmüyorsa **Variables** → **Add Reference** ile Postgres servisine referans verin.

### Ortam değişkenleri

Railway → uygulama servisi → **Variables**:

```
SHOPIFY_API_KEY=<Partner Dashboard Client ID>
SHOPIFY_API_SECRET=<Partner Dashboard Client secret>
SHOPIFY_APP_URL=https://scratchcart.up.railway.app
SCOPES=read_products,read_orders,write_discounts,read_discounts
NODE_ENV=production
```

`DATABASE_URL` ve `PORT` Railway tarafından sağlanır — elle eklemeyin.

### Build yapılandırması

`railway.json` zaten Dockerfile kullanacak şekilde ayarlıdır:

```json
{
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": { "startCommand": "npm run start" }
}
```

> **Dockerfile hakkında:** `npm ci` ile **tüm** bağımlılıklar kurulur (build sırasında `vite` ve `typescript` gereklidir), build alınır, sonra `npm prune --omit=dev` ile çalışma zamanı imajı küçültülür. `--omit=dev` ile başlayan bir kurulum build aşamasında hata verir.

---

## 3. Uygulama URL'lerini ayarla

`shopify.app.toml` dosyasında Railway alan adınızı yazın:

```toml
client_id = "<Partner Dashboard Client ID>"
application_url = "https://scratchcart.up.railway.app"

[auth]
redirect_urls = [
  "https://scratchcart.up.railway.app/auth/callback",
  "https://scratchcart.up.railway.app/auth/shopify/callback",
  "https://scratchcart.up.railway.app/api/auth/callback"
]

[app_proxy]
url = "https://scratchcart.up.railway.app/proxy"
subpath = "scratchcart"
prefix = "apps"
```

Ardından yapılandırmayı Shopify'a gönderin:

```bash
npm run config:link   # ilk kez bağlıyorsanız
npm run deploy        # yapılandırma + theme extension
```

---

## 4. Veritabanı migration'ları

`npm run start` komutu her açılışta `prisma migrate deploy` çalıştırır, yani migration'lar **otomatik uygulanır**. Elle çalıştırmak isterseniz:

```bash
DATABASE_URL="<railway postgres url>" npx prisma migrate deploy
```

Şemayı değiştirdiğinizde yeni migration üretin ve depoya ekleyin:

```bash
npx prisma migrate dev --name aciklayici_isim
```

> Migration dosyaları `prisma/migrations/` altında **depoya dahildir**. Bu klasör olmadan `migrate deploy` çalışmaz.

---

## 5. Test mağazasına kur

1. Partner Dashboard → uygulama → **Test your app** → bir development store seçin
2. Kurulum ekranında izinleri onaylayın
3. Mağaza yöneticisinde **Apps** → **ScratchCart** görünmelidir

### Widget'ı aktifleştir

Widget bir **App Embed** bloğudur; satıcının tema düzenleyiciden açması gerekir:

**Online Store** → **Themes** → **Customize** → **App embeds** → **ScratchCart** → aç → **Save**

Uygulama panelinde bu adım için doğrudan bir bağlantı sunulur.

---

## 6. Uçtan uca doğrulama

Aşağıdakilerin hepsini test mağazasında doğrulayın:

- [ ] Uygulama gömülü olarak açılıyor (boş sayfa yok, iframe hatası yok)
- [ ] Panel sayfalarının hepsi yükleniyor: Genel bakış, Bilet ayarları, Raporlar, Kazıma günlüğü, Plan
- [ ] Ayarlar kaydediliyor ve önizleme değişikliği yansıtıyor
- [ ] Sepete ürün ekleyip fareyi sayfa üstünden çıkarınca bilet açılıyor
- [ ] Kaplama kazınabiliyor (masaüstünde fare, mobilde dokunma)
- [ ] Ödül çıkıyor ve indirim sepete işleniyor
- [ ] Shopify yöneticisinde **Discounts** altında kod görünüyor
- [ ] Siparişi tamamlayınca panelde "kurtarıldı" olarak raporlanıyor
- [ ] Aynı oturumda ikinci kez bilet aynı kodu veriyor (yeni kod üretmiyor)
- [ ] Uygulamayı kaldırınca hata olmuyor

### Sık karşılaşılan sorunlar

| Belirti | Olası neden |
|---|---|
| Panel boş/beyaz açılıyor | `SHOPIFY_APP_URL` Railway alan adıyla uyuşmuyor |
| Widget hiç görünmüyor | App Embed tema düzenleyicide açılmamış, veya sepet boş |
| `/proxy/*` 401 dönüyor | App proxy `shopify.app.toml`'da tanımlı değil veya `npm run deploy` yapılmamış |
| Kod üretilmiyor, "unknown" hatası | `write_discounts` kapsamı eksik → `SCOPES` düzeltip **uygulamayı yeniden kurun** |
| `migrate deploy` hatası | `prisma/migrations/` klasörü depoda yok |
| Build'de `vite: not found` | Dockerfile'da `--omit=dev` ile kurulum yapılmış |

> **Kapsam (scope) değişikliği önemli:** `SCOPES` değiştirdiğinizde mevcut kurulumlar eski izinlerle çalışmaya devam eder. Uygulamayı test mağazasından kaldırıp yeniden kurmanız gerekir.

---

## 7. Canlıya alma

1. Railway'de son deploy'un yeşil olduğunu doğrulayın
2. `npm run deploy` ile extension'ların güncel sürümünü gönderin
3. [`docs/APP_STORE.md`](APP_STORE.md) kontrol listesini tamamlayın
4. Partner Dashboard → **Distribution** → **Shopify App Store** → başvuruyu gönderin

---

## Yedekleme

Railway PostgreSQL eklentisi otomatik yedek alır ancak kritik veriler için elle yedek de alın:

```bash
pg_dump "<DATABASE_URL>" > scratchcart-$(date +%F).sql
```
