import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Testler kasıtlı olarak `vite.config.ts`'ten ayrı tutulur.
 * Remix vite eklentisi route/manifest üretimi yapar ve test ortamında
 * gereksiz yere devreye girip "server-only module" ayrıştırmasını tetikler.
 * Burada yalnızca `~/...` yol takma adlarını çözen tsconfigPaths yeterlidir.
 *
 * NOT: vitest kendi vite sürümünü paketler; bu yüzden eklenti tipi projedeki
 * vite 6 tipiyle birebir örtüşmez. Çakışma yalnızca TİP düzeyindedir,
 * çalışma zamanında sorun yoktur. Bu yüzden tek bir noktada bastırılır.
 */
export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [tsconfigPaths() as any],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: false,
    restoreMocks: true,
  },
});
