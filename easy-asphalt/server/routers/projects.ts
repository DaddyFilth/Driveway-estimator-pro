import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createProject,
  createProjectShare,
  deleteProject,
  getProjectById,
  getProjectShareByToken,
  getUserProjects,
  incrementShareViewCount,
  updateProject,
} from "../db";
import { generateImage } from "../_core/imageGeneration";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const projectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getUserProjects(ctx.user.id)),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or unauthorized",
        });
      }
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        photoUrl: z.string(),
        photoKey: z.string(),
        projectName: z.string().optional(),
        zipCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await createProject({
        userId: ctx.user.id,
        photoUrl: input.photoUrl,
        photoKey: input.photoKey,
        projectName: input.projectName || "New Driveway Project",
        zipCode: input.zipCode,
        depthInches: 2,
        cornerPoints: JSON.stringify([
          { x: 20, y: 70 },
          { x: 80, y: 70 },
          { x: 90, y: 90 },
          { x: 10, y: 90 },
        ]),
      });
      return project;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        squareFeet: z.number().optional(),
        depthInches: z.number().optional(),
        cornerPoints: z.string().optional(),
        selectedMaterial: z.string().optional(),
        quantityNeeded: z.string().optional(),
        pricePerUnit: z.string().optional(),
        materialCost: z.string().optional(),
        contractorPricePerSquareFoot: z.string().optional(),
        laborCost: z.string().optional(),
        totalCost: z.string().optional(),
        previewImageUrl: z.string().optional(),
        previewImageKey: z.string().optional(),
        projectName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or unauthorized",
        });
      }
      const { id, ...updates } = input;
      return updateProject(id, updates);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or unauthorized",
        });
      }
      await deleteProject(input.id);
      return { success: true };
    }),

  createShareLink: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        contractorEmail: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.projectId);
      if (!project || project.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or unauthorized",
        });
      }

      const shareToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await createProjectShare({
        projectId: input.projectId,
        shareToken,
        contractorEmail: input.contractorEmail,
        expiresAt,
      });

      const shareUrl = `${process.env.APP_URL || "https://drivewaypro-btzvckak.manus.space"}/share/${shareToken}`;

      return { shareUrl, token: shareToken };
    }),

  getByShareToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const share = await getProjectShareByToken(input.token);
      if (!share) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share link not found",
        });
      }
      if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Share link has expired",
        });
      }

      await incrementShareViewCount(share.id);

      const project = await getProjectById(share.projectId);
      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }
      return { project, share };
    }),
});
