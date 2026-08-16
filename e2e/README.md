# Uçtan uca akış testi

Gerçek `scratchcart.js` ve `scratchcart.css` dosyalarını gerçek bir tarayıcıda
(Chromium) çalıştırır. Yalnızca ağ katmanı taklit edilir; kazıma gerçek pointer
ve dokunma olaylarıyla yapılır, yani tuval mantığı da test edilir.

`index.html` içindeki sahte `/proxy/config` yanıtı, gerçek `proxy.config.tsx`
rotasının döndürdüğü şekille **birebir aynıdır**. Sunucu sözleşmesini
değiştirirseniz bu dosyayı da güncelleyin.

## Çalıştırma

```bash
npm i -D playwright && npx playwright install chromium
node e2e/run.js
```

Test dosyaları vitest paketinden ayrıdır; `npm test` bunları çalıştırmaz.

## Kapsam

| # | Senaryo |
|---|---|
| 1 | Masaüstü tam akış: tetikleyici → kazıma → kod → sepete işleme |
| 2 | Sepet eşiğin altındayken bilet açılmaz |
| 3 | Aynı oturumda tekrar açılmaz, yeni kod üretilmez |
| 4 | Sunucu hatası anlamlı gösterilir, bilet kazara kapanmaz |
| 5 | Ödeme sayfasında hiç çalışmaz (yapılandırma bile çekilmez) |
| 6 | Mobil: hareketsizlik tetikleyicisi, tam ekran, dokunma hedefleri |
| 7 | Erişilebilirlik: dialog rolü, klavye odağı, Escape |
| 8 | `prefers-reduced-motion` açıkken kazanma ekranı görünür kalır |
