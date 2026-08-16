import type { MetaFunction } from "@remix-run/node";
import { COMPANY, H2, LegalPage, P, UL } from "~/components/LegalPage";

export const meta: MetaFunction = () => [
  { title: `Destek — ${COMPANY.appName}` },
  {
    name: "description",
    content: `${COMPANY.appName} kurulum, ayar ve sorun giderme desteği.`,
  },
];

export default function Support() {
  return (
    <LegalPage
      title="Destek"
      intro="Kurulum, ayarlar veya bir sorun için buradayız."
    >
      <H2>İletişim</H2>
      <P>
        {COMPANY.email} adresine yazın. İş günlerinde 24 saat içinde dönüş yapılır.
        Daha hızlı yardım için mağaza alan adınızı ve varsa ekran görüntüsünü
        ekleyin.
      </P>

      <H2>Bilet mağazada görünmüyor</H2>
      <UL>
        <li>
          Tema düzenleyicide uygulama gömülü bloğu açık mı? <strong>Online Store →
          Themes → Customize → App embeds → {COMPANY.appName}</strong> açık olmalı ve
          kaydedilmelidir.
        </li>
        <li>Panelde &quot;Kazı kazan biletini müşterilere göster&quot; açık mı?</li>
        <li>
          Sepette ürün var mı? Bilet yalnızca sepet dolu ve tutar belirlediğiniz alt
          sınırın üzerindeyken açılır.
        </li>
        <li>
          Aynı tarayıcıda daha önce gösterildiyse, bekleme süresi dolana kadar tekrar
          açılmaz.
        </li>
        <li>Bilet ödeme ve hesap sayfalarında hiçbir zaman gösterilmez.</li>
      </UL>

      <H2>İndirim kodu oluşturulmuyor</H2>
      <P>
        Bu genellikle izin eksikliğinden kaynaklanır. Uygulamayı mağazadan kaldırıp
        yeniden kurun; kurulum ekranında indirim izinlerini onayladığınızdan emin
        olun. Sorun sürerse bize yazın.
      </P>

      <H2>Raporlarda sipariş görünmüyor</H2>
      <P>
        Sipariş eşleştirmesi, siparişte uygulamanın ürettiği bir indirim kodunun
        kullanılmış olmasını gerektirir. Müşteri kodu kullanmadan alışverişi
        tamamladıysa o sipariş kurtarılmış sayılmaz.
      </P>

      <H2>Aboneliği iptal etme</H2>
      <P>
        Shopify yöneticinizde <strong>Settings → Apps and sales channels</strong>{" "}
        bölümünden uygulamayı kaldırdığınızda abonelik sona erer. Panelin Plan
        sayfasından ücretsiz plana da geçebilirsiniz.
      </P>
    </LegalPage>
  );
}
