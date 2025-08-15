var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  apiOptions: () => apiOptions,
  categories: () => categories,
  insertApiOptionSchema: () => insertApiOptionSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertMediaItemCategorySchema: () => insertMediaItemCategorySchema,
  insertMediaItemSchema: () => insertMediaItemSchema,
  insertMediaItemTagSchema: () => insertMediaItemTagSchema,
  insertTagSchema: () => insertTagSchema,
  insertUserSchema: () => insertUserSchema,
  mediaItemCategories: () => mediaItemCategories,
  mediaItemTags: () => mediaItemTags,
  mediaItems: () => mediaItems,
  tags: () => tags,
  users: () => users
});
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
var users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var mediaItems = sqliteTable("media_items", {
  id: text("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  type: text("type", { enum: ["video", "folder"] }).notNull().default("video"),
  duration: integer("duration"),
  // in seconds
  size: integer("size"),
  // in bytes
  downloadUrl: text("download_url"),
  downloadExpiresAt: integer("download_expires_at", { mode: "timestamp" }),
  downloadFetchedAt: integer("download_fetched_at", { mode: "timestamp" }),
  scrapedAt: integer("scraped_at", { mode: "timestamp" }),
  error: text("error"),
  folderVideoCount: integer("folder_video_count").default(0),
  folderImageCount: integer("folder_image_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
});
var tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("primary"),
  createdAt: integer("created_at", { mode: "timestamp" })
});
var mediaItemTags = sqliteTable("media_item_tags", {
  id: text("id").primaryKey(),
  mediaItemId: text("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
});
var categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
});
var mediaItemCategories = sqliteTable("media_item_categories", {
  id: text("id").primaryKey(),
  mediaItemId: text("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" })
});
var apiOptions = sqliteTable("api_options", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method", { enum: ["GET", "POST"] }).notNull().default("POST"),
  type: text("type", { enum: ["json", "query"] }).notNull().default("json"),
  field: text("field").notNull(),
  status: text("status", { enum: ["available", "limited", "offline"] }).notNull().default("available"),
  isActive: integer("is_active", { mode: "boolean" }).default(true)
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertMediaItemSchema = createInsertSchema(mediaItems).omit({
  id: true,
  createdAt: true
});
var insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true
});
var insertMediaItemTagSchema = createInsertSchema(mediaItemTags).omit({
  id: true
});
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});
var insertMediaItemCategorySchema = createInsertSchema(mediaItemCategories).omit({
  id: true
});
var insertApiOptionSchema = createInsertSchema(apiOptions).omit({
  id: true
});

// server/routes.ts
import { z } from "zod";
import fetch from "node-fetch";
var PORT = process.env.PORT || 5e3;
var BASE_URL = `http://localhost:${PORT}`;
var API_PROXIES = [
  { name: "playertera", url: "/api/playertera-proxy", method: "POST", type: "json", field: "url" },
  { name: "tera-fast", url: "/api/tera-fast-proxy", method: "GET", type: "query", field: "url" },
  { name: "teradwn", url: "/api/teradwn-proxy", method: "POST", type: "json", field: "link" },
  { name: "iteraplay", url: "/api/iteraplay-proxy", method: "POST", type: "json", field: "link" },
  { name: "raspywave", url: "/api/raspywave-proxy", method: "POST", type: "json", field: "link" },
  { name: "rapidapi", url: "/api/rapidapi-proxy", method: "POST", type: "json", field: "link" },
  { name: "tera-downloader-cc", url: "/api/tera-downloader-cc-proxy", method: "POST", type: "json", field: "url" },
  { name: "ronnie-client", url: "/api/ronnieverse-client", method: "GET", type: "query", field: "url" }
];
async function scrapeMetadata(mediaItemId, storage2) {
  const mediaItem = await storage2.getMediaItem(mediaItemId);
  if (!mediaItem) return;
  const result = await tryProxiesForDownload(mediaItem.url);
  if (result) {
    const updates = {
      title: result.raw?.title || mediaItem.title || "Unknown Title",
      description: result.raw?.description || mediaItem.description,
      thumbnail: result.raw?.thumbnail || mediaItem.thumbnail,
      duration: result.raw?.duration || mediaItem.duration,
      size: result.size || mediaItem.size,
      type: result.raw?.mime_type?.includes("video") ? "video" : result.raw?.mime_type?.includes("image") ? "image" : "video",
      error: null,
      scrapedAt: /* @__PURE__ */ new Date()
      // Note: Not storing download URLs here - those are fetched on-demand
    };
    await storage2.updateMediaItem(mediaItemId, updates);
  } else {
    await storage2.updateMediaItem(mediaItemId, {
      error: "Failed to scrape metadata",
      scrapedAt: /* @__PURE__ */ new Date()
    });
  }
}
async function registerRoutes(app, storage2) {
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });
  app.get("/api/media", async (req, res) => {
    try {
      const { search, tags: tags2, type, sizeRange, page = "1", limit = "20" } = req.query;
      const params = {
        search,
        tags: tags2 ? Array.isArray(tags2) ? tags2 : [tags2] : void 0,
        type,
        sizeRange,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      const result = await storage2.getMediaItems(params);
      const itemsNeedingMetadata = result.items.filter(
        (item) => !item.title || item.title === "Processing..." || !item.thumbnail || !item.scrapedAt
      );
      if (itemsNeedingMetadata.length > 0) {
        Promise.all(
          itemsNeedingMetadata.map((item) => scrapeMetadata(item.id, storage2))
        ).catch((error) => {
          console.error("Background metadata fetching failed:", error);
        });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });
  app.get("/api/media/:id", async (req, res) => {
    try {
      const mediaItem = await storage2.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media item" });
    }
  });
  app.post("/api/media", async (req, res) => {
    try {
      const { urls } = z.object({ urls: z.array(z.string().url()) }).parse(req.body);
      const createdItems = [];
      for (const url of urls) {
        let mediaItem = await storage2.getMediaItemByUrl(url);
        if (!mediaItem) {
          mediaItem = await storage2.createMediaItem({
            url,
            title: "Processing...",
            description: null,
            thumbnail: null
          });
        }
        createdItems.push(mediaItem);
      }
      res.status(201).json(createdItems);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating media items:", error);
      res.status(500).json({ error: "Failed to create media items" });
    }
  });
  app.put("/api/media/:id", async (req, res) => {
    try {
      const updates = req.body;
      const mediaItem = await storage2.updateMediaItem(req.params.id, updates);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update media item" });
    }
  });
  app.delete("/api/media/:id", async (req, res) => {
    try {
      const success = await storage2.deleteMediaItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media item" });
    }
  });
  app.post("/api/media/:id/refresh", async (req, res) => {
    try {
      const mediaItem = await storage2.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      const needsMetadata = !mediaItem.title || mediaItem.title === "Processing..." || !mediaItem.thumbnail || !mediaItem.scrapedAt;
      if (needsMetadata) {
        await scrapeMetadata(req.params.id, storage2);
      }
      const result = await tryProxiesForDownload(mediaItem.url);
      if (result) {
        const updates = {
          downloadUrl: result.download_url,
          downloadExpiresAt: new Date(result.expires_at),
          downloadFetchedAt: /* @__PURE__ */ new Date(),
          size: result.size || mediaItem.size,
          error: null
        };
        const updatedItem = await storage2.updateMediaItem(req.params.id, updates);
        res.json({ success: true, mediaItem: updatedItem });
      } else {
        await storage2.updateMediaItem(req.params.id, {
          error: "No download link found from proxies",
          downloadFetchedAt: /* @__PURE__ */ new Date()
        });
        res.status(404).json({ error: "No download link found from proxies" });
      }
    } catch (error) {
      console.error("Refresh metadata error:", error);
      res.status(500).json({ error: "Failed to refresh metadata" });
    }
  });
  app.post("/api/media/:id/metadata", async (req, res) => {
    try {
      const mediaItem = await storage2.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      const hasMetadata = mediaItem.title && mediaItem.title !== "Processing..." && mediaItem.thumbnail && mediaItem.scrapedAt;
      if (!hasMetadata) {
        await scrapeMetadata(req.params.id, storage2);
        const updatedItem = await storage2.getMediaItem(req.params.id);
        res.json({
          success: true,
          mediaItem: updatedItem,
          action: "fetched"
        });
      } else {
        res.json({
          success: true,
          mediaItem,
          action: "cached"
        });
      }
    } catch (error) {
      console.error("Metadata check error:", error);
      res.status(500).json({ error: "Failed to check/fetch metadata" });
    }
  });
  app.get("/api/media/:id/download", async (req, res) => {
    try {
      const { apiId } = req.query;
      const mediaItem = await storage2.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      if (apiId) {
        const apiOption = await storage2.getApiOption(apiId);
        if (!apiOption || !apiOption.isActive) {
          return res.status(400).json({ error: "Invalid or inactive API selected" });
        }
        const specificProxy = API_PROXIES.find((p) => p.name === apiOption.name.toLowerCase().replace(/\s+/g, "-"));
        if (specificProxy) {
          const result2 = await trySpecificProxy(mediaItem.url, specificProxy);
          if (result2) {
            await storage2.updateMediaItem(req.params.id, {
              downloadUrl: result2.download_url,
              downloadExpiresAt: new Date(result2.expires_at),
              downloadFetchedAt: /* @__PURE__ */ new Date(),
              size: result2.size || mediaItem.size
            });
            return res.json({
              source: "fresh",
              downloadUrl: result2.download_url,
              expiresAt: result2.expires_at,
              proxy: result2.proxy
            });
          } else {
            return res.status(404).json({ error: `No download link available from ${apiOption.name}` });
          }
        }
      }
      if (!apiId && mediaItem.downloadUrl && mediaItem.downloadExpiresAt) {
        const now = /* @__PURE__ */ new Date();
        const expiresAt = new Date(mediaItem.downloadExpiresAt);
        if (now < expiresAt) {
          return res.json({
            source: "cache",
            downloadUrl: mediaItem.downloadUrl,
            expiresAt: mediaItem.downloadExpiresAt
          });
        }
      }
      const result = await tryProxiesForDownload(mediaItem.url);
      if (result) {
        await storage2.updateMediaItem(req.params.id, {
          downloadUrl: result.download_url,
          downloadExpiresAt: new Date(result.expires_at),
          downloadFetchedAt: /* @__PURE__ */ new Date(),
          size: result.size || mediaItem.size
        });
        res.json({
          source: "fresh",
          downloadUrl: result.download_url,
          expiresAt: result.expires_at,
          proxy: result.proxy
        });
      } else {
        res.status(404).json({ error: "No download link available" });
      }
    } catch (error) {
      console.error("Get download URL error:", error);
      res.status(500).json({ error: "Failed to get download URL" });
    }
  });
  app.get("/api/tags", async (req, res) => {
    try {
      const tags2 = await storage2.getTags();
      res.json(tags2 || []);
    } catch (error) {
      console.error("Get tags error:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });
  app.post("/api/tags", async (req, res) => {
    try {
      const validatedData = insertTagSchema.parse(req.body);
      const tag = await storage2.createTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tag" });
    }
  });
  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const success = await storage2.deleteTag(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });
  app.post("/api/media/:mediaId/tags/:tagId", async (req, res) => {
    try {
      const { mediaId, tagId } = req.params;
      const result = await storage2.addTagToMediaItem(mediaId, tagId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to add tag to media item" });
    }
  });
  app.delete("/api/media/:mediaId/tags/:tagId", async (req, res) => {
    try {
      const { mediaId, tagId } = req.params;
      const success = await storage2.removeTagFromMediaItem(mediaId, tagId);
      if (!success) {
        return res.status(404).json({ error: "Tag association not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove tag from media item" });
    }
  });
  app.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage2.getCategories();
      res.json(categories2 || []);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage2.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const success = await storage2.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  app.post("/api/media/:mediaId/categories/:categoryId", async (req, res) => {
    try {
      const { mediaId, categoryId } = req.params;
      const result = await storage2.addCategoryToMediaItem(mediaId, categoryId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to add category to media item" });
    }
  });
  app.delete("/api/media/:mediaId/categories/:categoryId", async (req, res) => {
    try {
      const { mediaId, categoryId } = req.params;
      const success = await storage2.removeCategoryFromMediaItem(mediaId, categoryId);
      if (!success) {
        return res.status(404).json({ error: "Category association not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove category from media item" });
    }
  });
  app.get("/api/api-options", async (req, res) => {
    try {
      const options = await storage2.getApiOptions();
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API options" });
    }
  });
  app.post("/api/api-options", async (req, res) => {
    try {
      const apiOption = await storage2.createApiOption(req.body);
      res.status(201).json(apiOption);
    } catch (error) {
      console.error("Error creating API option:", error);
      res.status(500).json({ error: "Failed to create API option" });
    }
  });
  app.put("/api/api-options/:id", async (req, res) => {
    try {
      const apiOption = await storage2.updateApiOption(req.params.id, req.body);
      if (!apiOption) {
        return res.status(404).json({ error: "API option not found" });
      }
      res.json(apiOption);
    } catch (error) {
      console.error("Error updating API option:", error);
      res.status(500).json({ error: "Failed to update API option" });
    }
  });
  app.delete("/api/api-options/:id", async (req, res) => {
    try {
      const deleted = await storage2.deleteApiOption(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "API option not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API option:", error);
      res.status(500).json({ error: "Failed to delete API option" });
    }
  });
  app.post("/api/rapidapi-proxy", async (req, res) => {
    try {
      const { link } = req.body;
      if (!link) {
        return res.status(400).json({ error: "No link provided" });
      }
      const response = await fetch("https://terabox-downloader-direct-download-link-generator.p.rapidapi.com/fetch", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rapidapi-host": "terabox-downloader-direct-download-link-generator.p.rapidapi.com",
          "x-rapidapi-key": "357969b221msh32ff3122376c473p103b55jsn8b5dd54f26b7",
          "accept": "*/*"
        },
        body: JSON.stringify({ url: link })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  app.post("/api/playertera-proxy", async (req, res) => {
    const url = req.body.url;
    if (!url) {
      return res.status(400).json({ error: "Missing 'url' in request body" });
    }
    try {
      const response = await fetch("https://playertera.com/api/process-terabox", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "priority": "u=1, i",
          "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-csrf-token": "w0p0LHPpNZFrLR6Rh78o8zBzzyXdeZdEMjiDSSD4"
        },
        referrer: "https://playertera.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify({ url })
      });
      const text2 = await response.text();
      res.send(text2);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  app.post("/api/tera-downloader-cc-proxy", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const response = await fetch("https://www.tera-downloader.cc/api/terabox-download", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "referer": "https://www.tera-downloader.cc/"
        },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  app.get("/api/tera-fast-proxy", async (req, res) => {
    const { url } = req.query;
    const key = "C7mAq";
    if (!url) return res.status(400).json({ error: "Missing url" });
    try {
      const response = await fetch("https://hex.teraboxfast2.workers.dev/", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "content-type": "application/json",
          "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "referer": "https://www.teraboxfast.com/"
        },
        body: JSON.stringify({
          url,
          key
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  app.post("/api/teradwn-proxy", async (req, res) => {
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ error: "Link is required" });
    }
    try {
      const params = new URLSearchParams();
      params.append("action", "terabox_fetch");
      params.append("url", link);
      params.append("nonce", "ada26da710");
      const response = await fetch("https://teradownloadr.com/wp-admin/admin-ajax.php", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
          "referer": "https://teradownloadr.com/"
        },
        body: params.toString()
      });
      const data = await response.text();
      res.send(data);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  app.post("/api/iteraplay-proxy", async (req, res) => {
    const link = req.body.link;
    if (!link) {
      return res.status(400).json({ error: "Missing 'link' in request body" });
    }
    try {
      const response = await fetch("https://api.iteraplay.com/", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "priority": "u=1, i",
          "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-api-key": "terabox_pro_api_august_2025_premium"
        },
        referrer: "https://www.teraboxdownloader.pro/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify({ link })
      });
      const text2 = await response.text();
      res.send(text2);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  app.get("/api/ronnieverse-client", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const response = await fetch(`https://ronnieverse.dev/api/terabox?url=${encodeURIComponent(url)}`, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
  });
  app.post("/api/raspywave-proxy", async (req, res) => {
    const link = req.body.link;
    if (!link) {
      return res.status(400).json({ error: "Missing 'link' in request body" });
    }
    try {
      const response = await fetch("https://raspy-wave-5e61.sonukalakhari76.workers.dev/", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "priority": "u=1, i",
          "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site"
        },
        referrer: "https://downloadterabox.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: JSON.stringify({ link })
      });
      const text2 = await response.text();
      res.send(text2);
    } catch (err) {
      res.status(500).json({ error: "err instanceof Error ? err.message : 'Unknown error'" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}
function parseExpiryFromResponse(apiResponse, downloadUrl) {
  if (apiResponse && typeof apiResponse === "object") {
    if (apiResponse.expires_at) return new Date(apiResponse.expires_at).toISOString();
    if (apiResponse.expires_in) {
      return new Date(Date.now() + Number(apiResponse.expires_in) * 1e3).toISOString();
    }
    if (apiResponse.expires) {
      const v = String(apiResponse.expires);
      const m = v.match(/(\d+)\s*h/i);
      if (m) return new Date(Date.now() + Number(m[1]) * 3600 * 1e3).toISOString();
    }
  }
  if (downloadUrl) {
    try {
      const u = new URL(downloadUrl);
      const keys = ["expires", "expires_at", "dstime", "exp"];
      for (const k of keys) {
        if (u.searchParams.has(k)) {
          const v = u.searchParams.get(k);
          if (/^\d+$/.test(v) && v.length >= 9) {
            const epoch = parseInt(v, 10);
            const dt = new Date(epoch < 1e12 ? epoch * 1e3 : epoch);
            return dt.toISOString();
          }
          const m = v.match(/(\d+)\s*h/i);
          if (m) return new Date(Date.now() + Number(m[1]) * 3600 * 1e3).toISOString();
        }
      }
    } catch (e) {
    }
  }
  return new Date(Date.now() + 8 * 3600 * 1e3).toISOString();
}
async function trySpecificProxy(originalUrl, proxy) {
  try {
    let res;
    if (proxy.method === "GET") {
      const q = `${BASE_URL}${proxy.url}?${proxy.type === "query" ? `${proxy.field}=${encodeURIComponent(originalUrl)}` : ""}`;
      res = await fetch(q, { method: "GET" });
    } else {
      const body = proxy.type === "json" ? JSON.stringify({ [proxy.field]: originalUrl }) : `${proxy.field}=${encodeURIComponent(originalUrl)}`;
      const headers = proxy.type === "json" ? { "Content-Type": "application/json" } : { "Content-Type": "application/x-www-form-urlencoded" };
      res = await fetch(`${BASE_URL}${proxy.url}`, { method: "POST", headers, body });
    }
    if (!res.ok) {
      console.warn(`[proxy ${proxy.name}] returned ${res.status}`);
      return null;
    }
    let j;
    try {
      j = await res.json();
    } catch (e) {
      const text2 = await res.text();
      j = { rawText: text2 };
    }
    const linkCandidates = [
      j?.download_link,
      j?.downloadUrl,
      j?.download_url,
      j?.file,
      j?.file_url,
      j?.link,
      j?.url
    ].filter(Boolean);
    if (!linkCandidates.length && j) {
      for (const k of Object.keys(j)) {
        if (typeof j[k] === "string" && (j[k].includes("terabox") || j[k].includes("dm-d.terabox") || j[k].match(/\.mp4(\?|$)/i))) {
          linkCandidates.push(j[k]);
        } else if (typeof j[k] === "object" && j[k]) {
          const nested = j[k];
          if (nested.download_url || nested.download_link || nested.url) {
            linkCandidates.push(nested.download_url || nested.download_link || nested.url);
            Object.assign(j, nested);
          }
          for (const k2 of Object.keys(nested)) {
            if (typeof nested[k2] === "string" && nested[k2].includes("terabox")) {
              linkCandidates.push(nested[k2]);
            }
          }
        }
      }
    }
    if (linkCandidates.length) {
      const download_url = linkCandidates[0];
      const expires_at = parseExpiryFromResponse(j, download_url);
      const size = j?.size || j?.filesize || j?.file_size || j?.length || j?.data?.size || j?.result?.size || null;
      return { download_url, expires_at, size, raw: j, proxy: proxy.name };
    }
    if (j?.rawText) {
      const rx = /(https?:\/\/[^\s'"]{30,200})/g;
      const match = rx.exec(j.rawText);
      if (match) {
        const download_url = match[1];
        const expires_at = parseExpiryFromResponse(j, download_url);
        return { download_url, expires_at, size: null, raw: j, proxy: proxy.name };
      }
    }
  } catch (err) {
    console.warn(`[proxy ${proxy.name}] failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
  return null;
}
async function tryProxiesForDownload(originalUrl) {
  for (const proxy of API_PROXIES) {
    try {
      let res;
      if (proxy.method === "GET") {
        const q = `${BASE_URL}${proxy.url}?${proxy.type === "query" ? `${proxy.field}=${encodeURIComponent(originalUrl)}` : ""}`;
        res = await fetch(q, { method: "GET" });
      } else {
        const body = proxy.type === "json" ? JSON.stringify({ [proxy.field]: originalUrl }) : `${proxy.field}=${encodeURIComponent(originalUrl)}`;
        const headers = proxy.type === "json" ? { "Content-Type": "application/json" } : { "Content-Type": "application/x-www-form-urlencoded" };
        res = await fetch(`${BASE_URL}${proxy.url}`, { method: "POST", headers, body });
      }
      if (!res.ok) {
        console.warn(`[proxy ${proxy.name}] returned ${res.status}`);
        continue;
      }
      let j;
      try {
        j = await res.json();
      } catch (e) {
        const text2 = await res.text();
        j = { rawText: text2 };
      }
      const linkCandidates = [
        j?.download_link,
        j?.downloadUrl,
        j?.download_url,
        j?.file,
        j?.file_url,
        j?.link,
        j?.url
      ].filter(Boolean);
      if (!linkCandidates.length && j) {
        for (const k of Object.keys(j)) {
          if (typeof j[k] === "string" && (j[k].includes("terabox") || j[k].includes("dm-d.terabox") || j[k].match(/\.mp4(\?|$)/i))) {
            linkCandidates.push(j[k]);
          } else if (typeof j[k] === "object" && j[k]) {
            const nested = j[k];
            if (nested.download_url || nested.download_link || nested.url) {
              linkCandidates.push(nested.download_url || nested.download_link || nested.url);
              Object.assign(j, nested);
            }
            for (const k2 of Object.keys(nested)) {
              if (typeof nested[k2] === "string" && nested[k2].includes("terabox")) {
                linkCandidates.push(nested[k2]);
              }
            }
          }
        }
      }
      if (linkCandidates.length) {
        const download_url = linkCandidates[0];
        const expires_at = parseExpiryFromResponse(j, download_url);
        const size = j?.size || j?.filesize || j?.file_size || j?.length || j?.data?.size || j?.result?.size || null;
        const enhancedRaw = {
          ...j,
          title: j?.title || j?.filename || j?.name || j?.file_name || j?.data?.title || j?.result?.title,
          thumbnail: j?.thumbnail || j?.thumb || j?.preview || j?.image || j?.data?.thumbnail || j?.result?.thumbnail,
          description: j?.description || j?.desc || j?.data?.description || j?.result?.description,
          duration: j?.duration || j?.length || j?.time || j?.data?.duration || j?.result?.duration,
          mime_type: j?.mime_type || j?.mimeType || j?.type || j?.data?.type || j?.result?.type
        };
        return { download_url, expires_at, size, raw: enhancedRaw, proxy: proxy.name };
      }
      if (j?.rawText) {
        const rx = /(https?:\/\/[^\s'"]{30,200})/g;
        const match = rx.exec(j.rawText);
        if (match) {
          const download_url = match[1];
          const expires_at = parseExpiryFromResponse(j, download_url);
          return { download_url, expires_at, size: null, raw: j, proxy: proxy.name };
        }
      }
    } catch (err) {
      console.warn(`[proxy ${proxy.name}] failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
  return null;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server: server2 },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/storage.ts
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
var DrizzleStorage = class {
  db;
  sqlite;
  constructor(dbName = "cipherbox.db") {
    this.sqlite = new Database(dbName, { verbose: console.log });
    this.db = drizzle(this.sqlite, { schema: schema_exports, logger: true });
  }
  async close() {
    this.sqlite.close();
  }
  // Implement all methods from IStorage using Drizzle ORM
  // Users
  async getUser(id) {
    return await this.db.query.users.findFirst({ where: eq(users.id, id) });
  }
  async getUserByUsername(username) {
    return await this.db.query.users.findFirst({ where: eq(users.username, username) });
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const newUser = { ...insertUser, id };
    await this.db.insert(users).values(newUser);
    return newUser;
  }
  // Media Items
  async getMediaItems(params) {
    const { search, tags: tagFilter, categories: categoryFilter, type, sizeRange, page = 1, limit = 20 } = params;
    const qb = this.db.select({
      id: mediaItems.id,
      title: mediaItems.title,
      url: mediaItems.url,
      thumbnail: mediaItems.thumbnail,
      type: mediaItems.type,
      createdAt: mediaItems.createdAt
    }).from(mediaItems);
    if (tagFilter && tagFilter.length > 0) {
      qb.leftJoin(mediaItemTags, eq(mediaItems.id, mediaItemTags.mediaItemId)).leftJoin(tags, eq(mediaItemTags.tagId, tags.id)).where(inArray(tags.name, tagFilter));
    }
    const items = await qb.limit(limit).offset((page - 1) * limit).orderBy(desc(mediaItems.createdAt));
    const total = 0;
    const itemsWithTagsAndCategories = await Promise.all(
      items.map(async (item) => ({
        ...await this.getMediaItem(item.id)
      }))
    );
    return { items: itemsWithTagsAndCategories, total };
  }
  async getMediaItem(id) {
    const result = await this.db.query.mediaItems.findFirst({
      where: eq(mediaItems.id, id),
      with: {
        tags: { with: { tag: true } },
        categories: { with: { category: true } }
      }
    });
    if (!result) return void 0;
    return {
      ...result,
      tags: result.tags.map((t) => t.tag),
      categories: result.categories.map((c) => c.category)
    };
  }
  async getMediaItemByUrl(url) {
    return await this.db.query.mediaItems.findFirst({ where: eq(mediaItems.url, url) });
  }
  async createMediaItem(insertItem) {
    const id = randomUUID();
    const newItem = { ...insertItem, id, createdAt: /* @__PURE__ */ new Date() };
    await this.db.insert(mediaItems).values(newItem);
    return newItem;
  }
  async updateMediaItem(id, updates) {
    await this.db.update(mediaItems).set(updates).where(eq(mediaItems.id, id));
    return await this.getMediaItem(id);
  }
  async deleteMediaItem(id) {
    await this.db.delete(mediaItems).where(eq(mediaItems.id, id));
    return true;
  }
  // Tags
  async getTags() {
    return await this.db.query.tags.findMany({ orderBy: [asc(tags.name)] });
  }
  async getTag(id) {
    return await this.db.query.tags.findFirst({ where: eq(tags.id, id) });
  }
  async getTagByName(name) {
    return await this.db.query.tags.findFirst({ where: eq(tags.name, name) });
  }
  async createTag(insertTag) {
    const id = randomUUID();
    const newTag = { ...insertTag, id, createdAt: /* @__PURE__ */ new Date() };
    await this.db.insert(tags).values(newTag);
    return newTag;
  }
  async updateTag(id, updates) {
    await this.db.update(tags).set(updates).where(eq(tags.id, id));
    return await this.getTag(id);
  }
  async deleteTag(id) {
    await this.db.delete(tags).where(eq(tags.id, id));
    return true;
  }
  // Categories
  async getCategories() {
    return await this.db.query.categories.findMany({ orderBy: [asc(categories.name)] });
  }
  async getCategory(id) {
    return await this.db.query.categories.findFirst({ where: eq(categories.id, id) });
  }
  async getCategoryByName(name) {
    return await this.db.query.categories.findFirst({ where: eq(categories.name, name) });
  }
  async createCategory(insertCategory) {
    const id = randomUUID();
    const newCategory = { ...insertCategory, id, createdAt: /* @__PURE__ */ new Date() };
    await this.db.insert(categories).values(newCategory);
    return newCategory;
  }
  async updateCategory(id, updates) {
    await this.db.update(categories).set(updates).where(eq(categories.id, id));
    return await this.getCategory(id);
  }
  async deleteCategory(id) {
    await this.db.delete(categories).where(eq(categories.id, id));
    return true;
  }
  // Media Item Tags
  async addTagToMediaItem(mediaItemId, tagId) {
    const id = randomUUID();
    const newMediaItemTag = { id, mediaItemId, tagId };
    await this.db.insert(mediaItemTags).values(newMediaItemTag);
    return newMediaItemTag;
  }
  async removeTagFromMediaItem(mediaItemId, tagId) {
    await this.db.delete(mediaItemTags).where(and(eq(mediaItemTags.mediaItemId, mediaItemId), eq(mediaItemTags.tagId, tagId)));
    return true;
  }
  async getTagsForMediaItem(mediaItemId) {
    const mediaItemTags2 = await this.db.query.mediaItemTags.findMany({ where: eq(mediaItemTags.mediaItemId, mediaItemId) });
    if (mediaItemTags2.length === 0) return [];
    const tagIds = mediaItemTags2.map((t) => t.tagId);
    return await this.db.query.tags.findMany({ where: inArray(tags.id, tagIds) });
  }
  // Media Item Categories
  async addCategoryToMediaItem(mediaItemId, categoryId) {
    const id = randomUUID();
    const newMediaItemCategory = { id, mediaItemId, categoryId };
    await this.db.insert(mediaItemCategories).values(newMediaItemCategory);
    return newMediaItemCategory;
  }
  async removeCategoryFromMediaItem(mediaItemId, categoryId) {
    await this.db.delete(mediaItemCategories).where(and(eq(mediaItemCategories.mediaItemId, mediaItemId), eq(mediaItemCategories.categoryId, categoryId)));
    return true;
  }
  async getCategoriesForMediaItem(mediaItemId) {
    const mediaItemCategories2 = await this.db.query.mediaItemCategories.findMany({ where: eq(mediaItemCategories.mediaItemId, mediaItemId) });
    if (mediaItemCategories2.length === 0) return [];
    const categoryIds = mediaItemCategories2.map((c) => c.categoryId);
    return await this.db.query.categories.findMany({ where: inArray(categories.id, categoryIds) });
  }
  // API Options
  async getApiOptions() {
    return await this.db.query.apiOptions.findMany({ orderBy: [asc(apiOptions.name)] });
  }
  async getApiOption(id) {
    return await this.db.query.apiOptions.findFirst({ where: eq(apiOptions.id, id) });
  }
  async createApiOption(insertOption) {
    const id = randomUUID();
    const newOption = { ...insertOption, id };
    await this.db.insert(apiOptions).values(newOption);
    return newOption;
  }
  async updateApiOption(id, updates) {
    await this.db.update(apiOptions).set(updates).where(eq(apiOptions.id, id));
    return await this.getApiOption(id);
  }
  async deleteApiOption(id) {
    await this.db.delete(apiOptions).where(eq(apiOptions.id, id));
    return true;
  }
  async initializeDatabase() {
    console.log("DrizzleStorage.initializeDatabase: start");
    try {
      const statements = [
        `CREATE TABLE IF NOT EXISTS media_items (
          id TEXT PRIMARY KEY,
          url TEXT UNIQUE NOT NULL,
          title TEXT,
          description TEXT,
          thumbnail TEXT,
          duration INTEGER,
          size INTEGER,
          type TEXT DEFAULT 'video',
          download_url TEXT,
          download_expires_at DATETIME,
          download_fetched_at DATETIME,
          error TEXT,
          scraped_at DATETIME,
          folder_video_count INTEGER DEFAULT 0,
          folder_image_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT 'primary',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS media_item_tags (
          id TEXT PRIMARY KEY,
          media_item_id TEXT,
          tag_id TEXT,
          FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS media_item_categories (
          id TEXT PRIMARY KEY,
          media_item_id TEXT,
          category_id TEXT,
          FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS api_options (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          url TEXT NOT NULL,
          method TEXT DEFAULT 'POST',
          type TEXT DEFAULT 'json',
          field TEXT DEFAULT 'url',
          status TEXT DEFAULT 'available',
          is_active BOOLEAN DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];
      for (const statement of statements) {
        this.sqlite.exec(statement);
      }
      const insertStatement = this.sqlite.prepare(`
        INSERT OR IGNORE INTO api_options (id, name, url, method, type, field) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const defaultApiOptions = [
        ["playertera", "PlayerTera", "/api/playertera-proxy", "POST", "json", "url"],
        ["tera-fast", "TeraFast", "/api/tera-fast-proxy", "GET", "query", "url"],
        ["teradwn", "TeraDownloadr", "/api/teradwn-proxy", "POST", "json", "link"],
        ["iteraplay", "IteraPlay", "/api/iteraplay-proxy", "POST", "json", "link"],
        ["raspywave", "RaspyWave", "/api/raspywave-proxy", "POST", "json", "link"],
        ["rapidapi", "RapidAPI", "/api/rapidapi-proxy", "POST", "json", "link"],
        ["tera-downloader-cc", "Tera Downloader CC", "/api/tera-downloader-cc-proxy", "POST", "json", "url"]
      ];
      for (const option of defaultApiOptions) {
        insertStatement.run(...option);
      }
      console.log("DrizzleStorage.initializeDatabase: tables created");
    } catch (error) {
      console.error("DrizzleStorage.initializeDatabase: error", error);
      throw error;
    }
    console.log("DrizzleStorage.initializeDatabase: end");
  }
};

// server/index.ts
console.log("server/index.ts: file loaded");
function enableCORS(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
}
var server = null;
var storage = null;
async function startServer(dbName) {
  console.log("Starting backend server...");
  storage = new DrizzleStorage(dbName);
  console.log("DrizzleStorage instance created");
  await storage.initializeDatabase();
  console.log("Database initialized");
  const app = express2();
  app.use(enableCORS);
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path3.startsWith("/api")) {
        let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
        if (req.body && Object.keys(req.body).length > 0) {
          logLine += `
  body: ${JSON.stringify(req.body)}`;
        }
        if (capturedJsonResponse) {
          logLine += `
  response: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });
    next();
  });
  const httpServer = await registerRoutes(app, storage);
  server = httpServer;
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      port,
      environment: process.env.NODE_ENV || "development",
      electron: true
    });
  });
  return new Promise((resolve) => {
    server.listen({
      port,
      host: "127.0.0.1",
      reusePort: true
    }, () => {
      log(`serving on http://127.0.0.1:${port}`);
      console.log(`Backend is listening on http://127.0.0.1:${port}`);
      resolve({ app, server, port, storage });
    });
  });
}
async function stopServer() {
  if (storage) {
    await storage.close();
  }
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          return reject(err);
        }
        log("Server stopped");
        resolve();
      });
    } else {
      resolve();
    }
  });
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  startServer();
}
export {
  startServer,
  stopServer
};
