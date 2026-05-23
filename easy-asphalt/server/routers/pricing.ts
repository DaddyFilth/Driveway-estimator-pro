import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getMaterialPrices } from "../db";

export const pricingRouter = router({
  getByZipCode: publicProcedure
    .input(z.object({ zipCode: z.string(), material: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.material) {
        const price = await getMaterialPrices(input.zipCode, input.material);
        return price || {
          zipCode: input.zipCode,
          material: input.material,
          pricePerTon: "0.00",
          pricePerSquareFoot: "0.00",
          supplier: "Default Supplier",
        };
      }

      // Return all materials if no specific material requested
      const materials = ["hotmix", "millings", "tar_and_chip", "gravel"] as const;
      const results = await Promise.all(
        materials.map(async (material) => {
          const price = await getMaterialPrices(input.zipCode, material);
          return {
            material,
            ...price,
          };
        })
      );

      return results;
    }),
});
