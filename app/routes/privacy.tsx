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
  { title: `Gizlilik Politikası — ${COMPANY.appName}` },
  {
    name: "description",
    content: `${COMPANY.appName} hangi verileri işler, ne kadar saklar ve haklarınız nelerdir.`,
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Gizlilik Politikası"
      intro={`${COMPANY.appName}, mağazanızda kazı kazan biletini gösterirken hangi verileri işliyor?`}
    >
      <H2>Kısa özet</H2>
      <P>
        Uygulama, alışveriş yapan kişinin adını, e-posta adresini, telefonunu veya
        adresini okumaz, saklamaz ve hiçbir yere göndermez. Kazı kazan olaylarını
        anonim bir oturum kimliğiyle takip eder ve yalnızca kendi ürettiği indirim
        kodlarının hangi siparişlerde kullanıldığını eşleştirir.
      </P>

      <H2>Sorumlu taraf</H2>
      <P>
        {COMPANY.name} ({COMPANY.address}). İletişim: {COMPANY.email}
      </P>

      <H2>İşlenen veriler</H2>
      <UL>
        <li>
          <strong>Mağaza bilgileri:</strong> myshopify alan adı, kurulum kapsamları,
          abonelik planı, uygulama ayarlarınız (renkler, metinler, ödül oranları).
        </li>
        <li>
          <strong>Kazı kazan olayları:</strong> rastgele üretilmiş anonim oturum
          kimliği, cihaz türü (mobil/masaüstü/tablet), ülke kodu, Shopify&apos;ın
          ürettiği sepet belirteci, sepet tutarı, çıkan ödül, zaman damgası.
        </li>
        <li>
          <strong>İndirim kodları:</strong> uygulamanın Shopify üzerinde oluşturduğu
          kod, kademesi ve son kullanma tarihi.
        </li>
        <li>
          <strong>Sipariş eşleştirmesi:</strong> bir sipariş oluşturulduğunda, o
          siparişteki indirim kodları uygulamanın ürettiği kodlarla karşılaştırılır.
          Yalnızca eşleşme durumunda sipariş kimliği ve tutarı kaydedilir.
        </li>
      </UL>

      <H2>İşlenmeyen veriler</H2>
      <P>
        Müşteri adı, e-posta adresi, telefon numarası, teslimat veya fatura adresi,
        ödeme bilgileri, IP adresinin kalıcı kaydı. IP adresi yalnızca kötüye
        kullanımı engelleyen hız sınırlaması için anlık olarak kullanılır ve
        veritabanına yazılmaz.
      </P>

      <H2>Ziyaretçi rızası</H2>
      <P>
        Bilet, mağazanın rıza bandı üzerinden analitik izlemeyi reddeden
        ziyaretçilere hiç gösterilmez ve bu ziyaretçiler için sunucuya hiçbir
        olay gönderilmez. Kontrol, Shopify&apos;ın Customer Privacy API&apos;si
        üzerinden yapılır.
      </P>

      <H2>Saklama süreleri</H2>
      <UL>
        <li>Kazı kazan olayları: 90 gün</li>
        <li>Kullanılmamış ve süresi geçmiş indirim kodları: düzenli olarak silinir</li>
        <li>Mağaza ayarları: uygulama kurulu kaldığı sürece</li>
        <li>
          Uygulama kaldırıldığında mağazaya ait veriler{" "}
          <code>app/uninstalled</code> webhook&apos;u ile temizlenir.
        </li>
      </UL>

      <H2>Veri paylaşımı ve alt işleyiciler</H2>
      <P>
        Veriler satılmaz, kiralanmaz, reklam amacıyla paylaşılmaz. Hizmetin
        çalışması için kullanılan altyapı sağlayıcıları: Shopify (uygulama
        platformu ve indirim oluşturma) ve Railway (barındırma ve veritabanı).
      </P>

      <H2>Haklarınız</H2>
      <P>
        Verilerinize erişme, düzeltme ve silinmesini talep etme hakkınız vardır.
        Shopify&apos;ın GDPR webhook&apos;ları (
        <code>customers/data_request</code>, <code>customers/redact</code>,{" "}
        <code>shop/redact</code>) uygulanmıştır ve otomatik olarak yanıtlanır.
        Doğrudan talep için {COMPANY.email} adresine yazabilirsiniz.
      </P>

      <H2>Çerezler ve yerel depolama</H2>
      <P>
        Uygulama, aynı ziyaretçiye bileti tekrar tekrar göstermemek için tarayıcının
        yerel depolamasında anonim bir oturum kimliği ve gösterim sayacı tutar.
        Takip veya reklam çerezi kullanmaz.
      </P>

      <H2>Değişiklikler</H2>
      <P>
        Bu politika güncellendiğinde bu sayfadaki tarih değiştirilir. Önemli
        değişikliklerde kurulu mağazalara bildirim gönderilir.
      </P>

      <Divider />

      <H2>Privacy Policy (English)</H2>
      <P>
        {COMPANY.appName} does not read, store, or transmit any shopper&apos;s name,
        email address, phone number, or shipping address. It records scratch card
        events against a randomly generated anonymous session ID, and matches only
        the discount codes it created against incoming orders.
      </P>
      <P>
        <strong>Data processed:</strong> shop domain and app settings; anonymous
        session ID, device type, cart value, reward tier and timestamp for each
        scratch; discount codes created by the app; and, for orders that used one of
        those codes, the order ID and total value.
      </P>
      <P>
        <strong>Retention:</strong> scratch events for 90 days; expired unused codes
        are cleaned up regularly; shop settings for as long as the app is installed.
        All shop data is removed on uninstall via the <code>app/uninstalled</code>{" "}
        webhook.
      </P>
      <P>
        <strong>Sub-processors:</strong> Shopify (app platform and discount creation)
        and Railway (hosting and database). Data is never sold or shared for
        advertising.
      </P>
      <P>
        <strong>Your rights:</strong> you may request access, correction, or deletion
        of your data. Shopify&apos;s GDPR webhooks are implemented and answered
        automatically. Contact {COMPANY.email}.
      </P>
    </LegalPage>
  );
}
