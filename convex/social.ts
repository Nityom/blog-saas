"use node";

import { action, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { decrypt, encrypt } from "../lib/encryption";
import { createStoryImage } from "../lib/social";
import { parseJsonFromText } from "../lib/json";
import { put, del } from "@vercel/blob";
import type { Doc, Id } from "./_generated/dataModel";

type SocialContent = {
  facebook?: {
    postText?: string;
    hashtags?: string[];
  };
  instagram?: {
    storyText?: string;
    caption?: string;
    hashtags?: string[];
  };
};

function normalizeHashtags(hashtags: string[] = []) {
  return hashtags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload
      ? JSON.stringify(payload.error)
      : JSON.stringify(payload ?? { status: response.status });
    throw new Error(message || `Request failed: ${response.status}`);
  }
  return payload;
}

async function postToFacebookImpl(ctx: ActionCtx, clinicId: Id<"clinics">, postId: Id<"posts">) {
  const clinic = await ctx.runQuery(api.clinics.getById, { clinicId });
  const post = await ctx.runQuery(api.posts.getById, { postId });
  if (!clinic || !post || !clinic.autoPostFacebook || !clinic.metaPageId || !clinic.metaPageAccessTokenEncrypted) {
    return { skipped: true };
  }

  if (!post.socialContent) {
    return { skipped: true };
  }

  const socialContent = parseJsonFromText<SocialContent>(post.socialContent);
  const facebook = socialContent.facebook;
  if (!facebook?.postText) {
    return { skipped: true };
  }

  const decryptedToken = await decrypt(clinic.metaPageAccessTokenEncrypted);
  const socialPostId = await ctx.runMutation(internal.socialOps.createSocialPostEntry, {
    clinicId: clinic._id,
    postId: post._id,
    platform: "facebook",
    content: `${facebook.postText}\n\n${normalizeHashtags(facebook.hashtags)}`.trim(),
    imageUrl: post.imageUrl,
  });

  try {
    const body = new URLSearchParams({
      message: `${facebook.postText}\n\n${normalizeHashtags(facebook.hashtags)}`.trim(),
      link: clinic.bookingUrl,
      access_token: decryptedToken,
    });

    const result = await fetchJson(`https://graph.facebook.com/v18.0/${clinic.metaPageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    await ctx.runMutation(internal.socialOps.updateSocialPostEntry, {
      socialPostId,
      status: "posted",
      platformPostId: result.id,
      postedAt: Date.now(),
    });

    return { success: true, platformPostId: result.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await ctx.runMutation(internal.socialOps.updateSocialPostEntry, {
      socialPostId,
      status: "failed",
      errorMessage: message,
    });
    console.error("Facebook post failed:", message);
    return { success: false, errorMessage: message };
  }
}

async function postToInstagramImpl(ctx: ActionCtx, clinicId: Id<"clinics">, postId: Id<"posts">) {
  const clinic = await ctx.runQuery(api.clinics.getById, { clinicId });
  const post = await ctx.runQuery(api.posts.getById, { postId });
  if (!clinic || !post || !clinic.autoPostInstagram || !clinic.metaInstagramAccountId || !clinic.metaPageAccessTokenEncrypted) {
    return { skipped: true };
  }

  if (!post.socialContent) {
    return { skipped: true };
  }

  const socialContent = parseJsonFromText<SocialContent>(post.socialContent);
  const instagram = socialContent.instagram;
  if (!instagram?.storyText) {
    return { skipped: true };
  }

  const decryptedToken = await decrypt(clinic.metaPageAccessTokenEncrypted);
  const socialPostId = await ctx.runMutation(internal.socialOps.createSocialPostEntry, {
    clinicId: clinic._id,
    postId: post._id,
    platform: "instagram",
    content: `${instagram.storyText}\n${instagram.caption ?? ""}\n${normalizeHashtags(instagram.hashtags)}`.trim(),
    imageUrl: post.imageUrl,
  });

  let blobUrl: string | null = null;

  try {
    const storyImageBuffer = await createStoryImage(post.imageUrl, instagram.storyText, clinic.name);
    const blob = await put(`story-${post._id}-${Date.now()}.jpg`, storyImageBuffer, {
      access: "public",
      contentType: "image/jpeg",
    });
    blobUrl = blob.url;

    const createContainerBody = new URLSearchParams({
      image_url: blob.url,
      media_type: "STORIES",
      access_token: decryptedToken,
    });

    const creationResult = await fetchJson(
      `https://graph.facebook.com/v18.0/${clinic.metaInstagramAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: createContainerBody,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const publishBody = new URLSearchParams({
      creation_id: creationResult.id,
      access_token: decryptedToken,
    });

    const publishResult = await fetchJson(
      `https://graph.facebook.com/v18.0/${clinic.metaInstagramAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishBody,
      }
    );

    await ctx.runMutation(internal.socialOps.updateSocialPostEntry, {
      socialPostId,
      status: "posted",
      platformPostId: publishResult.id,
      postedAt: Date.now(),
    });

    return { success: true, platformPostId: publishResult.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await ctx.runMutation(internal.socialOps.updateSocialPostEntry, {
      socialPostId,
      status: "failed",
      errorMessage: message,
    });
    console.error("Instagram story failed:", message);
    return { success: false, errorMessage: message };
  } finally {
    if (blobUrl) {
      try {
        await del(blobUrl);
      } catch (cleanupError) {
        console.error("Failed to clean up story blob", cleanupError);
      }
    }
  }
}

async function refreshAllMetaTokensImpl(ctx: ActionCtx) {
  const clinics: Doc<"clinics">[] = await ctx.runQuery(api.clinics.getAll);
  const connectedClinics = clinics.filter(
    (clinic) => clinic.metaPageId && clinic.metaPageAccessTokenEncrypted
  );

  const results = await Promise.allSettled(
    connectedClinics.map(async (clinic) => {
      const currentToken = await decrypt(clinic.metaPageAccessTokenEncrypted!);
      const refreshResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(currentToken)}`
      );

      const payload = await refreshResponse.json();
      if (!refreshResponse.ok) {
        throw new Error(JSON.stringify(payload));
      }

      const refreshedToken = payload.access_token as string;
      const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 60 * 24 * 60 * 60;

      await ctx.runMutation(api.clinics.update, {
        clinicId: clinic._id,
        metaPageId: clinic.metaPageId,
        metaPageName: clinic.metaPageName,
        metaPageAccessTokenEncrypted: await encrypt(refreshedToken),
        metaTokenExpiresAt: Date.now() + expiresIn * 1000,
        metaInstagramAccountId: clinic.metaInstagramAccountId,
        autoPostFacebook: clinic.autoPostFacebook,
        autoPostInstagram: clinic.autoPostInstagram,
      });

      return { clinicId: clinic._id, success: true };
    })
  );

  results.forEach((result, index) => {
    const clinic = connectedClinics[index];
    if (result.status === "rejected") {
      console.error(`Meta token refresh failed for ${clinic.name}:`, result.reason);
    } else {
      console.log(`Meta token refreshed for ${clinic.name}`);
    }
  });

  return { refreshed: results.length };
}

export const postToFacebook = action({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    return await postToFacebookImpl(ctx, args.clinicId, args.postId);
  },
});

export const postToInstagram = action({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    return await postToInstagramImpl(ctx, args.clinicId, args.postId);
  },
});

export const postAllSocial = action({
  args: {
    clinicId: v.id("clinics"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const results = await Promise.allSettled([
      postToFacebookImpl(ctx, args.clinicId, args.postId),
      postToInstagramImpl(ctx, args.clinicId, args.postId),
    ]);

    return {
      facebook: results[0],
      instagram: results[1],
    };
  },
});

export const refreshAllMetaTokens = action({
  args: {},
  handler: async (ctx) => {
    return await refreshAllMetaTokensImpl(ctx);
  },
});