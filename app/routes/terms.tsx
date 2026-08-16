import type { MetaFunction } from "@remix-run/node";
import {
  COMPANY,
  Divider,
  H2,
  LegalPage,
  P,
  UL,
} from "~/components/LegalPage";

export const meta: MetaFunction = () => [
  { title: `Hizmet Şartları — ${COMPANY.appName}` },
  {
    name: "description",
    content: `${COMPANY.appName} kullanım koşulları, faturalandırma ve sorumluluk sınırları.`,
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Hizmet Şartları"
      intro={`${COMPANY.appName} uygulamasını kurarak aşağıdaki koşulları kabul etmiş olursunuz.`}
    >
      <H2>1. Hizmetin kapsamı</H2>
      <P>
        {COMPANY.appName}, mağazanızı terk etmek üzere olan ziyaretçilere kazı kazan
        biçiminde bir indirim sunan bir Shopify uygulamasıdır. Ödül çekilişi sunucu
        tarafında yapılır; oluşturulan indirim kodları tek kullanımlıktır ve süreye
        bağlıdır.
      </P>

      <H2>2. Hesap ve kurulum</H2>
      <P>
        Uygulamayı kurmak için geçerli bir Shopify mağazasına ve mağaza üzerinde
        yetkiye sahip olmanız gerekir. Uygulama, çalışabilmek için ürün, sipariş ve
        indirim izinleri ister; bu izinleri kurulum sırasında görür ve onaylarsınız.
      </P>

      <H2>3. Ücretlendirme</H2>
      <UL>
        <li>
          Tüm ödemeler Shopify Faturalandırma API&apos;si üzerinden alınır. Kart
          bilgileriniz uygulamaya hiçbir zaman iletilmez.
        </li>
        <li>
          Abonelikler 30 günlük dönemler hâlinde yenilenir. Ücretsiz deneme süresi
          plan sayfasında belirtilir.
        </li>
        <li>
          Aboneliği istediğiniz zaman iptal edebilirsiniz. İptal, içinde bulunulan
          dönemin sonunda geçerli olur; kısmi dönem için iade yapılmaz.
        </li>
        <li>
          Ücretsiz planın aylık gösterim sınırı vardır. Sınır dolduğunda bilet
          gösterilmez; mağazanız normal çalışmaya devam eder.
        </li>
      </UL>

      <H2>4. Sizin sorumluluğunuz</H2>
      <UL>
        <li>
          Sunduğunuz indirimlerin ve kampanya koşullarının, faaliyet gösterdiğiniz
          ülkedeki tüketici ve reklam mevzuatına uygun olmasından siz sorumlusunuz.
        </li>
        <li>
          Ödül oranlarını ve indirim tutarlarını siz belirlersiniz. Kâr marjınıza
          etkisi sizin sorumluluğunuzdadır.
        </li>
        <li>
          Uygulamayı yasa dışı, yanıltıcı veya Shopify Hizmet Şartları&apos;na aykırı
          biçimde kullanamazsınız.
        </li>
      </UL>

      <H2>5. Hizmet sürekliliği</H2>
      <P>
        Hizmet &quot;olduğu gibi&quot; sunulur. Kesintisiz çalışacağına dair bir
        garanti verilmez. Bakım, altyapı arızası veya Shopify tarafındaki
        değişiklikler nedeniyle geçici kesintiler olabilir. Uygulama devre dışı
        kaldığında bilet gösterilmez; mağazanızın çalışması etkilenmez.
      </P>

      <H2>6. Sorumluluğun sınırı</H2>
      <P>
        {COMPANY.name}, uygulamanın kullanımından doğan dolaylı zararlardan (kâr
        kaybı, veri kaybı, itibar kaybı) sorumlu tutulamaz. Her hâlükârda toplam
        sorumluluk, talebin doğduğu tarihten önceki 12 ay içinde uygulama için
        ödediğiniz tutarla sınırlıdır.
      </P>

      <H2>7. Fesih</H2>
      <P>
        Uygulamayı istediğiniz zaman mağazanızdan kaldırabilirsiniz. Kaldırma anında
        abonelik sona erer ve mağaza verileriniz temizlenir. Bu şartların ihlali
        hâlinde hizmeti askıya alma veya sonlandırma hakkımız saklıdır.
      </P>

      <H2>8. Değişiklikler</H2>
      <P>
        Bu şartlar güncellenebilir. Önemli değişikliklerde kurulu mağazalara
        bildirim gönderilir. Değişiklikten sonra uygulamayı kullanmaya devam etmeniz
        yeni şartları kabul ettiğiniz anlamına gelir.
      </P>

      <H2>9. Uygulanacak hukuk</H2>
      <P>
        Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İzmir
        mahkemeleri ve icra daireleri yetkilidir.
      </P>

      <H2>10. İletişim</H2>
      <P>Sorularınız için: {COMPANY.email}</P>

      <Divider />

      <H2>Terms of Service (English)</H2>
      <P>
        By installing {COMPANY.appName} you agree to these terms. The app shows a
        scratch card discount to visitors who are about to leave your store. The
        draw runs server-side; generated discount codes are single-use and
        time-limited.
      </P>
      <P>
        <strong>Billing:</strong> all charges are handled through the Shopify Billing
        API; card details never reach the app. Subscriptions renew in 30-day periods
        and can be cancelled at any time, effective at the end of the current period.
        Partial periods are not refunded. The free plan has a monthly display limit.
      </P>
      <P>
        <strong>Your responsibility:</strong> you set the reward odds and discount
        amounts, and you are responsible for compliance with consumer and advertising
        law in your market, and for the effect of discounts on your margins.
      </P>
      <P>
        <strong>Warranty and liability:</strong> the service is provided &quot;as
        is&quot; with no uptime guarantee. {COMPANY.name} is not liable for indirect
        damages including lost profit, lost data, or reputational harm. Total
        liability is limited to the amount you paid for the app in the 12 months
        preceding the claim.
      </P>
      <P>
        <strong>Termination:</strong> you may uninstall at any time; the subscription
        ends and your shop data is deleted. These terms are governed by the laws of
        Türkiye, with the courts of İzmir having jurisdiction.
      </P>
      <P>Contact: {COMPANY.email}</P>
    </LegalPage>
  );
}
