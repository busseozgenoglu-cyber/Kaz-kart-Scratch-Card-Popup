import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShopSettings } from "@prisma/client";

const created: any[] = [];

// Prisma taklidi: indirim kaydının doğru alanlarla yazıldığını doğrulamak için.
vi.mock("~/db.server", () => ({
  default: {
    discountCode: {
      create: vi.fn(async (args: any) => {
        created.push(args.data);
        return args.data;
      }),
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

const { DiscountError, createDiscountForTier } = await import(
  "~/lib/discount.server"
);

function baseSettings(overrides: Partial<ShopSettings> = {}): ShopSettings {
  return {
    discountValidMinutes: 30,
    freeShippingThreshold: 150,
    minCartValue: 50,
    ...overrides,
  } as ShopSettings;
}

/** Verilen GraphQL yanıtını döndüren sahte admin istemcisi. */
function fakeAdmin(payload: unknown) {
  const graphql = vi.fn(async () => ({
    json: async () => payload,
  })) as any;
  return { admin: { graphql }, graphql };
}

function okBasic(id = "gid://shopify/DiscountCodeNode/1") {
  return {
    data: {
      discountCodeBasicCreate: {
        codeDiscountNode: { id },
        userErrors: [],
      },
    },
  };
}

function okShipping(id = "gid://shopify/DiscountCodeNode/2") {
  return {
    data: {
      discountCodeFreeShippingCreate: {
        codeDiscountNode: { id },
        userErrors: [],
      },
    },
  };
}

beforeEach(() => {
  created.length = 0;
});

describe("createDiscountForTier - yüzde indirimi", () => {
  it("discountCodeBasicCreate mutation'ını çağırır", async () => {
    const { admin, graphql } = fakeAdmin(okBasic());

    await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "20_percent",
      settings: baseSettings(),
    });

    expect(graphql).toHaveBeenCalledOnce();
    expect(graphql.mock.calls[0][0]).toContain("discountCodeBasicCreate");
  });

  it("yüzdeyi Shopify'ın beklediği 0–1 ondalık biçiminde gönderir", async () => {
    const { admin, graphql } = fakeAdmin(okBasic());

    await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "20_percent",
      settings: baseSettings(),
    });

    const variables = graphql.mock.calls[0][1].variables.basicCodeDiscount;
    // %20 => 0.20 olmalı, 20 değil. Yanlışı mağazada %2000 indirim demektir.
    expect(variables.customerGets.value.percentage).toBe(0.2);
  });

  it("kodu tek kullanımlık ve müşteri başına bir kez olarak kısıtlar", async () => {
    const { admin, graphql } = fakeAdmin(okBasic());

    await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "10_percent",
      settings: baseSettings(),
    });

    const variables = graphql.mock.calls[0][1].variables.basicCodeDiscount;
    expect(variables.usageLimit).toBe(1);
    expect(variables.appliesOncePerCustomer).toBe(true);
  });

  it("son kullanma tarihini ayarlardaki süreye göre hesaplar", async () => {
    const { admin } = fakeAdmin(okBasic());

    const before = Date.now();
    const result = await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "10_percent",
      settings: baseSettings({ discountValidMinutes: 45 }),
    });

    const diffMinutes = (result.expiresAt.getTime() - before) / 60_000;
    expect(diffMinutes).toBeGreaterThan(44);
    expect(diffMinutes).toBeLessThan(46);
  });

  it("üretilen kodu ve GID'yi veritabanına yazar", async () => {
    const { admin } = fakeAdmin(okBasic("gid://shopify/DiscountCodeNode/99"));

    const result = await createDiscountForTier({
      admin,
      shopId: "shop_42",
      tier: "15_percent",
      settings: baseSettings(),
    });

    expect(created).toHaveLength(1);
    expect(created[0].shopId).toBe("shop_42");
    expect(created[0].code).toBe(result.code);
    expect(created[0].tier).toBe("15_percent");
    expect(created[0].value).toBe(15);
    expect(created[0].shopifyDiscountId).toBe("99");
  });
});

describe("createDiscountForTier - kargo bedava", () => {
  it("ayrı bir kargo mutation'ı kullanır", async () => {
    const { admin, graphql } = fakeAdmin(okShipping());

    await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "free_shipping",
      settings: baseSettings(),
    });

    expect(graphql.mock.calls[0][0]).toContain("discountCodeFreeShippingCreate");
  });

  it("eşik değeri tanımlıysa minimum sepet koşulu ekler", async () => {
    const { admin, graphql } = fakeAdmin(okShipping());

    await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "free_shipping",
      settings: baseSettings({ freeShippingThreshold: 250 as any }),
    });

    const variables =
      graphql.mock.calls[0][1].variables.freeShippingCodeDiscount;
    expect(
      variables.minimumRequirement.subtotal.greaterThanOrEqualToSubtotal,
    ).toBe("250.00");
  });

  it("eşik sıfırsa minimum koşul göndermez", async () => {
    const { admin, graphql } = fakeAdmin(okShipping());

    await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "free_shipping",
      settings: baseSettings({ freeShippingThreshold: 0 as any }),
    });

    const variables =
      graphql.mock.calls[0][1].variables.freeShippingCodeDiscount;
    expect(variables.minimumRequirement).toBeUndefined();
  });

  it("kargo ödülünde yüzde değeri sıfır kaydedilir", async () => {
    const { admin } = fakeAdmin(okShipping());

    const result = await createDiscountForTier({
      admin,
      shopId: "shop_1",
      tier: "free_shipping",
      settings: baseSettings(),
    });

    expect(result.value).toBe(0);
  });
});

describe("createDiscountForTier - hata yönetimi", () => {
  it("userErrors dolu geldiğinde sessizce başarılı olmaz", async () => {
    const { admin } = fakeAdmin({
      data: {
        discountCodeBasicCreate: {
          codeDiscountNode: null,
          userErrors: [
            { field: ["basicCodeDiscount", "code"], message: "Code already exists" },
          ],
        },
      },
    });

    await expect(
      createDiscountForTier({
        admin,
        shopId: "shop_1",
        tier: "10_percent",
        settings: baseSettings(),
      }),
    ).rejects.toThrow(DiscountError);
  });

  it("hata mesajında Shopify'ın açıklamasını taşır", async () => {
    const { admin } = fakeAdmin({
      data: {
        discountCodeBasicCreate: {
          codeDiscountNode: null,
          userErrors: [{ field: ["code"], message: "Code already exists" }],
        },
      },
    });

    await expect(
      createDiscountForTier({
        admin,
        shopId: "shop_1",
        tier: "10_percent",
        settings: baseSettings(),
      }),
    ).rejects.toThrow(/Code already exists/);
  });

  it("üst düzey GraphQL hatalarını yakalar", async () => {
    const { admin } = fakeAdmin({
      errors: [{ message: "Access denied for discountCodeBasicCreate field" }],
    });

    await expect(
      createDiscountForTier({
        admin,
        shopId: "shop_1",
        tier: "10_percent",
        settings: baseSettings(),
      }),
    ).rejects.toThrow(/Access denied/);
  });

  it("izin eksikliğinde (boş yanıt) yol gösterici hata verir", async () => {
    // write_discounts kapsamı yoksa Shopify boş data döndürebilir.
    const { admin } = fakeAdmin({ data: {} });

    await expect(
      createDiscountForTier({
        admin,
        shopId: "shop_1",
        tier: "10_percent",
        settings: baseSettings(),
      }),
    ).rejects.toThrow(/write_discounts/);
  });

  it("hata durumunda veritabanına kayıt yazmaz", async () => {
    const { admin } = fakeAdmin({
      data: {
        discountCodeBasicCreate: {
          codeDiscountNode: null,
          userErrors: [{ field: ["code"], message: "Hata" }],
        },
      },
    });

    await expect(
      createDiscountForTier({
        admin,
        shopId: "shop_1",
        tier: "10_percent",
        settings: baseSettings(),
      }),
    ).rejects.toThrow();

    // Shopify'da oluşmayan bir kod veritabanında görünmemeli.
    expect(created).toHaveLength(0);
  });
});
