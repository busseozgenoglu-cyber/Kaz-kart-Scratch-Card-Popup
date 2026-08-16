import type { ShopSettings } from "@prisma/client";
import prisma from "~/db.server";
import { generateCode, tierValue, type Tier } from "./scratch-engine.server";

/**
 * NOT (spec düzeltmesi):
 * Orijinal spec `discountCodeAppCreate` kullanıyordu. O mutation yalnızca
 * uygulamanın bir Shopify Discount **Function** extension'ı varsa çalışır ve
 * `functionId` ister. ScratchCart yüzde ve kargo indirimi dağıttığı için
 * Shopify'ın yerleşik mutation'ları doğru seçimdir:
 *   - yüzde indirim  -> discountCodeBasicCreate
 *   - kargo bedava   -> discountCodeFreeShippingCreate
 * Bu sayede ekstra function deploy'u ve `write_discounts` dışında izin gerekmez.
 */

const BASIC_DISCOUNT_MUTATION = `#graphql
  mutation scratchCartBasicDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            codes(first: 1) { nodes { code } }
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

const FREE_SHIPPING_MUTATION = `#graphql
  mutation scratchCartShippingDiscount($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeFreeShipping {
            title
            codes(first: 1) { nodes { code } }
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

const DELETE_DISCOUNT_MUTATION = `#graphql
  mutation scratchCartDeleteDiscount($id: ID!) {
    discountCodeDelete(id: $id) {
      deletedCodeDiscountId
      userErrors { field message }
    }
  }
`;

type AdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export class DiscountError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DiscountError";
  }
}

/**
 * Tek kullanımlık, süreli bir indirim kodu üretir ve Shopify'a kaydeder.
 * Aynı kod veritabanına da yazılır; sipariş webhook'unda eşleştirmek için gerekir.
 */
export async function createDiscountForTier(params: {
  admin: AdminClient;
  shopId: string;
  tier: Tier;
  settings: ShopSettings;
}): Promise<{ code: string; gid: string; value: number; expiresAt: Date }> {
  const { admin, shopId, tier, settings } = params;

  const code = generateCode(tier);
  const startsAt = new Date();
  const expiresAt = new Date(
    startsAt.getTime() + settings.discountValidMinutes * 60_000,
  );

  const shared = {
    title: `ScratchCart · ${code}`,
    code,
    startsAt: startsAt.toISOString(),
    endsAt: expiresAt.toISOString(),
    usageLimit: 1,
    appliesOncePerCustomer: true,
    customerSelection: { all: true },
  };

  let gid: string;
  let value = 0;

  if (tier === "free_shipping") {
    const threshold = Number(settings.freeShippingThreshold ?? 0);
    const response = await admin.graphql(FREE_SHIPPING_MUTATION, {
      variables: {
        freeShippingCodeDiscount: {
          ...shared,
          destination: { all: true },
          ...(threshold > 0
            ? {
                minimumRequirement: {
                  subtotal: {
                    greaterThanOrEqualToSubtotal: threshold.toFixed(2),
                  },
                },
              }
            : {}),
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: false,
          },
        },
      },
    });
    gid = unwrap(
      await response.json(),
      "discountCodeFreeShippingCreate",
    );
  } else {
    value = tierValue(tier);
    const minCart = Number(settings.minCartValue ?? 0);
    const response = await admin.graphql(BASIC_DISCOUNT_MUTATION, {
      variables: {
        basicCodeDiscount: {
          ...shared,
          customerGets: {
            // Shopify yüzdeyi 0–1 aralığında ondalık bekler.
            value: { percentage: value / 100 },
            items: { all: true },
          },
          ...(minCart > 0
            ? {
                minimumRequirement: {
                  subtotal: {
                    greaterThanOrEqualToSubtotal: minCart.toFixed(2),
                  },
                },
              }
            : {}),
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: true,
          },
        },
      },
    });
    gid = unwrap(await response.json(), "discountCodeBasicCreate");
  }

  await prisma.discountCode.create({
    data: {
      shopId,
      code,
      tier,
      value,
      shopifyGid: gid,
      shopifyDiscountId: gid.split("/").pop() ?? null,
      expiresAt,
    },
  });

  return { code, gid, value, expiresAt };
}

/** GraphQL yanıtını çözer; userErrors varsa net bir hata fırlatır (sessiz başarısızlık yok). */
function unwrap(payload: any, mutationName: string): string {
  if (payload?.errors?.length) {
    throw new DiscountError(
      `Shopify GraphQL hatası: ${payload.errors[0]?.message}`,
      payload.errors,
    );
  }

  const result = payload?.data?.[mutationName];
  if (!result) {
    throw new DiscountError(
      `${mutationName} yanıtı boş döndü. Uygulamanın write_discounts izni olduğundan emin olun.`,
      payload,
    );
  }

  if (result.userErrors?.length) {
    const first = result.userErrors[0];
    throw new DiscountError(
      `${mutationName}: ${first.message} (alan: ${first.field?.join(".") ?? "-"})`,
      result.userErrors,
    );
  }

  const id = result.codeDiscountNode?.id;
  if (!id) {
    throw new DiscountError(`${mutationName} indirim kimliği döndürmedi.`, result);
  }
  return id;
}

/**
 * Kullanılmamış, süresi geçmiş kodları Shopify'dan ve veritabanından siler.
 * Mağazanın indirim listesini şişirmemek App Store incelemesinde önemlidir.
 */
export async function cleanupExpiredCodes(
  admin: AdminClient,
  shopId: string,
  limit = 100,
): Promise<number> {
  const stale = await prisma.discountCode.findMany({
    where: {
      shopId,
      isUsed: false,
      expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      shopifyGid: { not: null },
    },
    take: limit,
  });

  let deleted = 0;
  for (const record of stale) {
    try {
      await admin.graphql(DELETE_DISCOUNT_MUTATION, {
        variables: { id: record.shopifyGid },
      });
      deleted += 1;
    } catch (error) {
      console.error("[scratchcart] indirim silinemedi", record.code, error);
    }
  }

  if (stale.length) {
    await prisma.discountCode.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    });
  }

  return deleted;
}
