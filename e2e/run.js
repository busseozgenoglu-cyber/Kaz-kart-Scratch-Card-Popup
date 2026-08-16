/**
 * ScratchCart — uçtan uca akış testi.
 *
 * Gerçek `scratchcart.js` ve `scratchcart.css` dosyalarını gerçek bir
 * tarayıcıda çalıştırır; yalnızca ağ katmanı taklit edilir. Kazıma gerçek
 * pointer olaylarıyla yapılır, yani tuval mantığı da test edilir.
 */
const { chromium, devices } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  const file = path.join(ROOT, url === "/" ? "index.html" : url);
  fs.readFile(file, (err, data) => {
    if (err) {
      // Uzantısız yollar (örn. /checkouts/abc) mağaza sayfası gibi davranır:
      // index.html sunulur ki widget o yolda da yüklenmeye çalışsın.
      if (!path.extname(url)) {
        const html = fs.readFileSync(path.join(ROOT, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(html);
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end("{}");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "text/plain" });
    res.end(data);
  });
});

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log("  ✓", name);
  } else {
    failed++;
    failures.push(name + (detail ? " — " + detail : ""));
    console.log("  ✗", name, detail ? "→ " + detail : "");
  }
}

/** Bileti çıkış niyetiyle açar (fare sayfanın üst kenarından çıkar). */
async function triggerExitIntent(page) {
  await page.mouse.move(600, 300);
  await page.mouse.move(600, 4);
  await page.evaluate(() => {
    document.dispatchEvent(
      new MouseEvent("mouseleave", { clientY: 2, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mouseout", { clientY: 2, relatedTarget: null, bubbles: true }),
    );
  });
}

/** Folyoyu gerçek pointer olaylarıyla kazır. */
async function scratch(page, passes = 14) {
  const box = await page.locator(".sc-foil").boundingBox();
  if (!box) return false;
  for (let i = 0; i < passes; i++) {
    // Eşik aşılınca panel kaybolur; aynı koordinatlara basmayı sürdürmek
    // artık orada duran butona tıklamak anlamına gelir.
    if (!(await page.locator(".sc-panel").isVisible())) break;
    const y = box.y + box.height * (0.12 + (0.76 * i) / (passes - 1));
    await page.mouse.move(box.x + 6, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 6, y, { steps: 8 });
    await page.mouse.up();
  }
  return true;
}

(async () => {
  await new Promise((r) => server.listen(5310, r));
  const BASE = "http://localhost:5310/";
  const browser = await chromium.launch();

  /* ===================================================================== */
  console.log("\n▸ 1. Masaüstü: açılıştan sepete tam akış");
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    check("Bilet sayfa açılışında GÖRÜNMEZ", 
      !(await page.locator(".sc-root[data-open='true']").count()));
    check("Yapılandırma bir kez çekilir",
      (await page.evaluate(() => window.__calls.config)) === 1);

    await triggerExitIntent(page);
    await page.waitForTimeout(700);

    const opened = await page.locator(".sc-root[data-open='true']").count();
    check("Çıkış niyeti bileti açar", opened === 1);
    check("Gösterim sunucuya bildirilir",
      (await page.evaluate(() => window.__calls.start)) === 1);

    check("Başlık ayarlardan gelir",
      (await page.locator(".sc-title").textContent()) === "SİZE ÖZEL HEDİYE");
    check("Kazıma yazısı 'KAZI' gösterilir",
      (await page.locator(".sc-hint").textContent()).trim() === "KAZI");

    const hintSize = await page.locator(".sc-hint").evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize),
    );
    check("Kazıma yazısı belirgin boyutta (>24px)", hintSize > 24, `${hintSize}px`);

    const prizeBefore = (await page.locator(".sc-prize-value").textContent()).trim();
    check("Kazımadan ÖNCE ödül yazısı boştur", prizeBefore === "", `"${prizeBefore}"`);

    check("Kazanmadan önce /win çağrılmaz",
      (await page.evaluate(() => window.__calls.win)) === 0);

    await scratch(page);
    await page.waitForTimeout(1200);

    check("Kazıma /win çağrısını tetikler",
      (await page.evaluate(() => window.__calls.win)) === 1);

    const winBody = await page.evaluate(() => window.__winBodies[0]);
    check("İstekte oturum kimliği gönderilir", Boolean(winBody && winBody.sessionId));
    check("İstekte sepet tutarı gönderilir",
      winBody && typeof winBody.cartValue === "number", JSON.stringify(winBody));

    check("Bilet 'kazanıldı' durumuna geçer",
      (await page.locator(".sc-ticket[data-state='won']").count()) === 1);
    check("Kazanılan ödül GÖRÜNÜR kalır",
      (await page.locator(".sc-prize-value").textContent()).includes("%20"));
    check("Ödül alanı ekranda görünüyor",
      await page.locator(".sc-prize-value").isVisible());
    check("İndirim kodu gösterilir",
      (await page.locator(".sc-code-value").textContent()).trim() === "SC20-K7ARJ4");
    check("Geçerlilik süresi gösterilir",
      (await page.locator(".sc-expiry").textContent()).includes("30"));
    check("İlerleme çubuğu gizlenir",
      !(await page.locator(".sc-progress").isVisible()));

    check("İndirim sepete işlenir",
      (await page.evaluate(() => window.__calls.discount)) === 1);
    check("Sipariş eşleştirme özniteliği yazılır",
      (await page.evaluate(() => window.__calls.cartUpdate)) === 1);

    check("Konsolda JS hatası yok", errors.length === 0, errors[0] || "");
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 2. Boş/düşük sepette bilet açılmaz");
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    // minCartValue = 50 TL; sepeti 10 TL yap (1000 kuruş)
    await page.goto(BASE + "?cart=1000", { waitUntil: "networkidle" });
    await triggerExitIntent(page);
    await page.waitForTimeout(900);
    check("Sepet eşiğin altındayken bilet açılmaz",
      (await page.locator(".sc-root[data-open='true']").count()) === 0);
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 3. Aynı oturumda tekrar: yeni kod ÜRETİLMEZ");
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await triggerExitIntent(page);
    await page.waitForTimeout(600);
    await scratch(page);
    await page.waitForTimeout(1000);
    const firstCode = await page.locator(".sc-code-value").textContent();

    // Aynı tarayıcı oturumu, sayfa yenilendi
    await page.reload({ waitUntil: "networkidle" });
    await triggerExitIntent(page);
    await page.waitForTimeout(800);

    const reopened = await page.locator(".sc-root[data-open='true']").count();
    check("Oturum başına gösterim sınırı uygulanır (tekrar açılmaz)", reopened === 0,
      `açılan: ${reopened}`);
    check("Kod sayfa yenilemesinden sonra da korunur",
      (await page.evaluate(() => (window.__serverState.issued || {}).code)) ===
        firstCode.trim());
    check("Toplam yalnızca bir /win çağrısı yapıldı",
      (await page.evaluate(() => window.__calls.win)) === 0,
      "yenileme sonrası yeni istek olmamalı");
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 4. Sunucu hatası kullanıcıya anlamlı gösterilir");
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      window.__scenario.winFails = true;
    });
    await triggerExitIntent(page);
    await page.waitForTimeout(600);
    await scratch(page);
    await page.waitForTimeout(1200);

    check("Hata durumu işaretlenir",
      (await page.locator(".sc-ticket[data-error='true']").count()) === 1);
    const msg = (await page.locator(".sc-error").textContent()).trim();
    check("Hata mesajı boş değil", msg.length > 5, msg);
    check("Hatada indirim uygulanmaz",
      (await page.evaluate(() => window.__calls.discount)) === 0);
    check("Bilet açık kalır (kaza ile kapanmaz)",
      (await page.locator(".sc-root[data-open='true']").count()) === 1);
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 5. Ödeme sayfasında hiç çalışmaz");
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE + "checkouts/abc123", { waitUntil: "networkidle" });
    await triggerExitIntent(page);
    await page.waitForTimeout(900);

    check("Ödeme sayfasında yapılandırma bile çekilmez",
      (await page.evaluate(() => window.__calls.config)) === 0);
    check("Ödeme sayfasında bilet açılmaz",
      (await page.locator(".sc-root").count()) === 0);
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 6. Mobil: dokunmatik kazıma ve tam ekran");
  {
    const page = await browser.newPage({
      ...devices["iPhone 13"],
      hasTouch: true,
    });
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Mobilde çıkış niyeti yok; hareketsizlik tetikleyicisi (2 sn) beklenir
    await page.waitForTimeout(3200);

    const open = await page.locator(".sc-root[data-open='true']").count();
    check("Hareketsizlik tetikleyicisi mobilde çalışır", open === 1);
    check("Tam ekran modu etkin",
      (await page.locator(".sc-root[data-fullscreen='true']").count()) === 1);

    if (open) {
      const box = await page.locator(".sc-foil").boundingBox();
      const screen = page.viewportSize();
      check("Bilet ekran genişliğini doldurur",
        box.width > screen.width * 0.8, `${Math.round(box.width)}/${screen.width}`);

      // Dokunmatik kazıma
      for (let i = 0; i < 12; i++) {
        const y = box.y + box.height * (0.12 + (0.76 * i) / 11);
        await page.touchscreen.tap(box.x + box.width / 2, y);
      }
      const ctaBox = await page.locator(".sc-cta").boundingBox();
      check("Ana buton dokunma hedefi ≥44px", ctaBox.height >= 44,
        `${Math.round(ctaBox.height)}px`);
    }
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 7. Erişilebilirlik");
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await triggerExitIntent(page);
    await page.waitForTimeout(600);

    check("Modal rolü tanımlı",
      (await page.locator(".sc-root[role='dialog']").count()) === 1);
    check("aria-modal işaretli",
      (await page.locator(".sc-root[aria-modal='true']").count()) === 1);
    check("Folyo klavyeyle odaklanabilir",
      (await page.locator(".sc-foil[tabindex='0']").count()) === 1);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    check("Escape bileti kapatır",
      (await page.locator(".sc-root[data-open='true']").count()) === 0);
    check("Kazımadan kapatma sunucuya bildirilir",
      (await page.evaluate(() => window.__calls.abandon)) === 1);
    await page.close();
  }

  /* ===================================================================== */
  console.log("\n▸ 8. Devinim azaltma tercihi");
  {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    await page.goto(BASE, { waitUntil: "networkidle" });
    await triggerExitIntent(page);
    await page.waitForTimeout(600);
    await scratch(page);
    await page.waitForTimeout(1200);

    check("Devinim kapalıyken kod yine görünür",
      await page.locator(".sc-code").isVisible());
    const opacity = await page.locator(".sc-code").evaluate(
      (el) => getComputedStyle(el).opacity,
    );
    check("Kod tam opak (animasyona takılmaz)", parseFloat(opacity) === 1, opacity);
    await page.close();
  }

  await browser.close();
  server.close();

  console.log("\n" + "─".repeat(52));
  console.log(`SONUÇ:  ${passed} geçti,  ${failed} kaldı`);
  if (failures.length) {
    console.log("\nBaşarısız kontroller:");
    failures.forEach((f) => console.log("  •", f));
  }
  console.log("─".repeat(52));
  process.exit(failed ? 1 : 0);
})();
