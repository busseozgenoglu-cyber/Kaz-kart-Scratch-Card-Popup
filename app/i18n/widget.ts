export type WidgetStrings = {
  eyebrow: string;
  prizeNote: string;
  canvasLabel: string;
  scratchToReveal: string;
  keepScratching: string;
  checking: string;
  applying: string;
  applied: string;
  goToCart: string;
  continueShopping: string;
  noThanks: string;
  close: string;
  copy: string;
  copied: string;
  expiresIn: string;
  terms: string;
  errors: {
    quota_exceeded: string;
    already_played: string;
    cart_too_small: string;
    rate_limited: string;
    discount_failed: string;
    unknown: string;
  };
};

const tr: WidgetStrings = {
  eyebrow: "Tek kullanımlık bilet",
  prizeNote: "Sepetinize işlenecek",
  canvasLabel: "Kazıma alanı. Ödülü açmak için sürükleyin veya Enter tuşuna basın.",
  scratchToReveal: "Kazımak için kaplamayı sürükleyin",
  keepScratching: "Devam edin…",
  checking: "Ödülünüz hazırlanıyor",
  applying: "Sepete işleniyor",
  applied: "Sepete işlendi",
  goToCart: "Sepete git",
  continueShopping: "Alışverişe devam et",
  noThanks: "Şimdi değil, teşekkürler",
  close: "Kapat",
  copy: "Kopyala",
  copied: "Kopyalandı",
  expiresIn: "Kod {minutes} dakika geçerli",
  terms: "Tek kullanımlık. Diğer kampanyalarla birleşmeyebilir.",
  errors: {
    quota_exceeded: "Bu kampanya şimdilik dolu. Kısa süre sonra tekrar deneyin.",
    already_played: "Bu bileti daha önce kazıdınız. Kodunuz sepetinizde geçerli.",
    cart_too_small: "Sepet tutarı bu kampanyanın alt sınırının altında.",
    rate_limited: "Çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin.",
    discount_failed: "İndirim oluşturulamadı. Sepetiniz olduğu gibi duruyor.",
    unknown: "Bir şeyler ters gitti. Sepetinizde bir değişiklik yapılmadı.",
  },
};

const en: WidgetStrings = {
  eyebrow: "One-time ticket",
  prizeNote: "Applied to your cart",
  canvasLabel: "Scratch area. Drag to reveal your prize, or press Enter.",
  scratchToReveal: "Drag across the coating to scratch",
  keepScratching: "Keep going…",
  checking: "Preparing your prize",
  applying: "Adding to your cart",
  applied: "Added to cart",
  goToCart: "Go to cart",
  continueShopping: "Continue shopping",
  noThanks: "Not right now",
  close: "Close",
  copy: "Copy",
  copied: "Copied",
  expiresIn: "Code valid for {minutes} minutes",
  terms: "One use per customer. May not combine with other offers.",
  errors: {
    quota_exceeded: "This campaign is full for now. Try again shortly.",
    already_played: "You already scratched this ticket. Your code is still on the cart.",
    cart_too_small: "Your cart is below this campaign's minimum.",
    rate_limited: "Too many attempts. Try again in a minute.",
    discount_failed: "The discount could not be created. Your cart is unchanged.",
    unknown: "Something went wrong. Nothing was changed on your cart.",
  },
};

const es: WidgetStrings = {
  eyebrow: "Billete de un solo uso",
  prizeNote: "Se aplica a tu carrito",
  canvasLabel: "Zona para rascar. Arrastra para revelar tu premio o pulsa Enter.",
  scratchToReveal: "Arrastra sobre la capa para rascar",
  keepScratching: "Sigue…",
  checking: "Preparando tu premio",
  applying: "Añadiendo al carrito",
  applied: "Añadido al carrito",
  goToCart: "Ir al carrito",
  continueShopping: "Seguir comprando",
  noThanks: "Ahora no",
  close: "Cerrar",
  copy: "Copiar",
  copied: "Copiado",
  expiresIn: "Código válido durante {minutes} minutos",
  terms: "Un solo uso. Puede no combinarse con otras ofertas.",
  errors: {
    quota_exceeded: "Esta campaña está completa por ahora. Inténtalo más tarde.",
    already_played: "Ya rascaste este billete. Tu código sigue en el carrito.",
    cart_too_small: "Tu carrito está por debajo del mínimo de la campaña.",
    rate_limited: "Demasiados intentos. Vuelve a intentarlo en un minuto.",
    discount_failed: "No se pudo crear el descuento. Tu carrito no ha cambiado.",
    unknown: "Algo salió mal. No se modificó nada en tu carrito.",
  },
};

const CATALOG: Record<string, WidgetStrings> = { tr, en, es };

export function widgetStrings(language: string): WidgetStrings {
  return CATALOG[language] ?? CATALOG.tr;
}
