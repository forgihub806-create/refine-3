import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { type IStorage } from "./storage.js";
import { insertMediaItemSchema, insertTagSchema, insertCategorySchema, type MediaSearchParams, type InsertMediaItem } from "../shared/schema.js";
import { z } from "zod";
import { WebSocketServer } from 'ws';

// MultiScraper integration
import fetch from "node-fetch";

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const API_PROXIES = [
  { name: "playertera", url: "/api/playertera-proxy", method: "POST", type: "json", field: "url" },
  { name: "tera-fast", url: "/api/tera-fast-proxy", method: "GET", type: "query", field: "url" },
  { name: "teradwn", url: "/api/teradwn-proxy", method: "POST", type: "json", field: "link" },
  { name: "iteraplay", url: "/api/iteraplay-proxy", method: "POST", type: "json", field: "link" },
  { name: "raspywave", url: "/api/raspywave-proxy", method: "POST", type: "json", field: "link" },
  { name: "rapidapi", url: "/api/rapidapi-proxy", method: "POST", type: "json", field: "link" },
  { name: "tera-downloader-cc", url: "/api/tera-downloader-cc-proxy", method: "POST", type: "json", field: "url" },
  { name: "ronnie-client", url: "/api/ronnieverse-client", method: "GET", type: "query", field: "url" }
];

async function scrapeMetadata(mediaItemId: string, storage: IStorage) {
  const mediaItem = await storage.getMediaItem(mediaItemId);
  if (!mediaItem) return;

  // TODO: Replace this with multiscraper.py integration
  // For now, use simplified metadata extraction without download URLs
  const result = await tryProxiesForDownload(mediaItem.url);

  if (result) {
    const updates = {
      title: result.raw?.title || mediaItem.title || "Unknown Title",
      description: result.raw?.description || mediaItem.description,
      thumbnail: result.raw?.thumbnail || mediaItem.thumbnail,
      duration: result.raw?.duration || mediaItem.duration,
      size: result.size || mediaItem.size,
      type: result.raw?.mime_type?.includes('video') ? 'video' : (result.raw?.mime_type?.includes('image') ? 'image' : 'video'),
      error: null,
      scrapedAt: new Date(),
      // Note: Not storing download URLs here - those are fetched on-demand
    };
    await storage.updateMediaItem(mediaItemId, updates);
  } else {
    await storage.updateMediaItem(mediaItemId, {
      error: "Failed to scrape metadata",
      scrapedAt: new Date(),
    });
  }
}

export function registerRoutes(app: Express, storage: IStorage): Server {

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    console.log('Health check requested');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.get('/api/categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories || []);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get('/api/media/pages', async (req: Request, res: Response) => {
    try {
      const { search, tags, categories, type, sizeRange, page = "1", limit = "20" } = req.query;

      const params: MediaSearchParams = {
        search: search as string,
        tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
        categories: categories ? (Array.isArray(categories) ? categories as string[] : [categories as string]) : undefined,
        type: type as "video" | "folder",
        sizeRange: sizeRange as "small" | "medium" | "large",
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await storage.getMediaItems(params);

      // Check for missing metadata and trigger background fetching for current page items
      const itemsNeedingMetadata = result.items.filter(item =>
        !item.title || item.title === "Processing..." ||
        !item.thumbnail || !item.scrapedAt
      );

      // Trigger background metadata fetching for items missing data
      if (itemsNeedingMetadata.length > 0) {
        Promise.all(
          itemsNeedingMetadata.map(item => scrapeMetadata(item.id, storage))
        ).catch(error => {
          console.error("Background metadata fetching failed:", error);
        });
      }

      res.json(result);
    } catch (error) {
      console.error("Get media items error:", error);
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });

  app.get('/api/api-options', async (req: Request, res: Response) => {
    try {
      const options = await storage.getApiOptions();
      res.json(options);
    } catch (error) {
      console.error("Get API options error:", error);
      res.status(500).json({ error: "Failed to fetch API options" });
    }
  });


  // Media Items Routes
  app.get("/api/media", async (req: Request, res: Response) => {
    try {
      const { search, tags, type, sizeRange, page = "1", limit = "20" } = req.query;

      const params: MediaSearchParams = {
        search: search as string,
        tags: tags ? (Array.isArray(tags) ? tags as string[] : [tags as string]) : undefined,
        type: type as "video" | "folder",
        sizeRange: sizeRange as "small" | "medium" | "large",
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await storage.getMediaItems(params);

      // Check for missing metadata and trigger background fetching for current page items
      const itemsNeedingMetadata = result.items.filter(item =>
        !item.title || item.title === "Processing..." ||
        !item.thumbnail || !item.scrapedAt
      );

      // Trigger background metadata fetching for items missing data
      if (itemsNeedingMetadata.length > 0) {
        Promise.all(
          itemsNeedingMetadata.map(item => scrapeMetadata(item.id, storage))
        ).catch(error => {
          console.error("Background metadata fetching failed:", error);
        });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });

  app.get("/api/media/:id", async (req: Request, res: Response) => {
    try {
      const mediaItem = await storage.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media item" });
    }
  });

  app.post("/api/media", async (req: Request, res: Response) => {
    try {
      const { urls } = z.object({ urls: z.array(z.string().url()) }).parse(req.body);
      const createdItems = [];

      for (const url of urls) {
        let mediaItem = await storage.getMediaItemByUrl(url);
        if (!mediaItem) {
          // Create with minimal metadata - don't auto-scrape
          mediaItem = await storage.createMediaItem({
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

  app.put("/api/media/:id", async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const mediaItem = await storage.updateMediaItem(req.params.id, updates);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update media item" });
    }
  });

  app.delete("/api/media/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteMediaItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media item" });
    }
  });

  // Refresh metadata using multiScraper
  app.post("/api/media/:id/refresh", async (req: Request, res: Response) => {
    try {
      const mediaItem = await storage.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }

      // Check if we need to fetch metadata from database first
      const needsMetadata = !mediaItem.title || mediaItem.title === "Processing..." ||
                           !mediaItem.thumbnail || !mediaItem.scrapedAt;

      if (needsMetadata) {
        // Fetch full metadata including title, thumbnail, etc.
        await scrapeMetadata(req.params.id, storage);
      }

      // Always refresh download URL since it expires
      const result = await tryProxiesForDownload(mediaItem.url);

      if (result) {
        const updates = {
          downloadUrl: result.download_url,
          downloadExpiresAt: new Date(result.expires_at),
          downloadFetchedAt: new Date(),
          size: result.size || mediaItem.size,
          error: null
        };

        const updatedItem = await storage.updateMediaItem(req.params.id, updates);
        res.json({ success: true, mediaItem: updatedItem });
      } else {
        await storage.updateMediaItem(req.params.id, {
          error: "No download link found from proxies",
          downloadFetchedAt: new Date()
        });
        res.status(404).json({ error: "No download link found from proxies" });
      }
    } catch (error) {
      console.error("Refresh metadata error:", error);
      res.status(500).json({ error: "Failed to refresh metadata" });
    }
  });

  // Check and fetch metadata for specific media item
  app.post("/api/media/:id/metadata", async (req: Request, res: Response) => {
    try {
      const mediaItem = await storage.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }

      // Check if metadata exists in database
      const hasMetadata = mediaItem.title && mediaItem.title !== "Processing..." &&
                         mediaItem.thumbnail && mediaItem.scrapedAt;

      if (!hasMetadata) {
        // Invoke multiScraper to fetch metadata
        await scrapeMetadata(req.params.id, storage);
        const updatedItem = await storage.getMediaItem(req.params.id);
        res.json({
          success: true,
          mediaItem: updatedItem,
          action: "fetched"
        });
      } else {
        res.json({
          success: true,
          mediaItem: mediaItem,
          action: "cached"
        });
      }
    } catch (error) {
      console.error("Metadata check error:", error);
      res.status(500).json({ error: "Failed to check/fetch metadata" });
    }
  });

  // Get download URL for media item
  app.get("/api/media/:id/download", async (req: Request, res: Response) => {
    try {
      const { apiId } = req.query;
      const mediaItem = await storage.getMediaItem(req.params.id);

      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }

      // If specific API requested, use only that API
      if (apiId) {
        const apiOption = await storage.getApiOption(apiId as string);
        if (!apiOption || !apiOption.isActive) {
          return res.status(400).json({ error: "Invalid or inactive API selected" });
        }

        // Use specific API proxy
        const specificProxy = API_PROXIES.find(p => p.name === apiOption.name.toLowerCase().replace(/\s+/g, '-'));
        if (specificProxy) {
          const result = await trySpecificProxy(mediaItem.url, specificProxy);
          if (result) {
            // Update the media item with fresh download info
            await storage.updateMediaItem(req.params.id, {
              downloadUrl: result.download_url,
              downloadExpiresAt: new Date(result.expires_at),
              downloadFetchedAt: new Date(),
              size: result.size || mediaItem.size
            });

            return res.json({
              source: "fresh",
              downloadUrl: result.download_url,
              expiresAt: result.expires_at,
              proxy: result.proxy
            });
          } else {
            return res.status(404).json({ error: `No download link available from ${apiOption.name}` });
          }
        }
      }

      // Check if we have a valid cached download URL (for non-specific requests)
      if (!apiId && mediaItem.downloadUrl && mediaItem.downloadExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(mediaItem.downloadExpiresAt);
        if (now < expiresAt) {
          return res.json({
            source: "cache",
            downloadUrl: mediaItem.downloadUrl,
            expiresAt: mediaItem.downloadExpiresAt
          });
        }
      }

      // Try to get fresh download URL using all APIs
      const result = await tryProxiesForDownload(mediaItem.url);

      if (result) {
        // Update the media item with fresh download info
        await storage.updateMediaItem(req.params.id, {
          downloadUrl: result.download_url,
          downloadExpiresAt: new Date(result.expires_at),
          downloadFetchedAt: new Date(),
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

  // Tags Routes
  app.get("/api/tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      res.json(tags || []);
    } catch (error) {
      console.error("Get tags error:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.delete("/api/tags/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteTag(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });

  // Media Item Tags Routes
  app.post("/api/media/:mediaId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const { mediaId, tagId } = req.params;
      const result = await storage.addTagToMediaItem(mediaId, tagId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to add tag to media item" });
    }
  });

  app.delete("/api/media/:mediaId/tags/:tagId", async (req: Request, res: Response) => {
    try {
      const { mediaId, tagId } = req.params;
      const success = await storage.removeTagFromMediaItem(mediaId, tagId);
      if (!success) {
        return res.status(404).json({ error: "Tag association not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove tag from media item" });
    }
  });

  // Categories Routes
  app.post("/api/categories", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.delete("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Media Item Categories Routes
  app.post("/api/media/:mediaId/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const { mediaId, categoryId } = req.params;
      const result = await storage.addCategoryToMediaItem(mediaId, categoryId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to add category to media item" });
    }
  });

  app.delete("/api/media/:mediaId/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const { mediaId, categoryId } = req.params;
      const success = await storage.removeCategoryFromMediaItem(mediaId, categoryId);
      if (!success) {
        return res.status(404).json({ error: "Category association not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove category from media item" });
    }
  });

  // API Options Routes
  app.post("/api/api-options", async (req: Request, res: Response) => {
    try {
      const apiOption = await storage.createApiOption(req.body);
      res.status(201).json(apiOption);
    } catch (error) {
      console.error("Error creating API option:", error);
      res.status(500).json({ error: "Failed to create API option" });
    }
  });

  app.put("/api/api-options/:id", async (req: Request, res: Response) => {
    try {
      const apiOption = await storage.updateApiOption(req.params.id, req.body);
      if (!apiOption) {
        return res.status(404).json({ error: "API option not found" });
      }
      res.json(apiOption);
    } catch (error) {
      console.error("Error updating API option:", error);
      res.status(500).json({ error: "Failed to update API option" });
    }
  });

  app.delete("/api/api-options/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteApiOption(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "API option not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API option:", error);
      res.status(500).json({ error: "Failed to delete API option" });
    }
  });

  app.post("/api/rapidapi-proxy", async (req: Request, res: Response) => {
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
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.post("/api/playertera-proxy", async (req: Request, res: Response) => {
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
                "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-csrf-token": "w0p0LHPpNZFrLR6Rh78o8zBzzyXdeZdEMjiDSSD4"
            },
            referrer: "https://playertera.com/",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({ url })
        });

        const text = await response.text();
        res.send(text);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.post("/api/tera-downloader-cc-proxy", async (req: Request, res: Response) => {
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
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.get("/api/tera-fast-proxy", async (req: Request, res: Response) => {
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
          url: url,
          key: key
        })
      });

      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.post("/api/teradwn-proxy", async (req: Request, res: Response) => {
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
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.post("/api/iteraplay-proxy", async (req: Request, res: Response) => {
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
                "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "x-api-key": "terabox_pro_api_august_2025_premium"
            },
            referrer: "https://www.teraboxdownloader.pro/",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({ link })
        });

        const text = await response.text();
        res.send(text);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.get("/api/ronnieverse-client", async (req: Request, res: Response) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const response = await fetch(`https://ronnieverse.dev/api/terabox?url=${encodeURIComponent(url as string)}`, {
        method: "GET",
        headers: {
          "accept": "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      const data = await response.json();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.post("/api/raspywave-proxy", async (req: Request, res: Response) => {
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
                "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site"
            },
            referrer: "https://downloadterabox.com/",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({ link })
        });

        const text = await response.text();
        res.send(text);
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      console.log('Received:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  

  return httpServer;
}

// MultiScraper utility functions
function parseExpiryFromResponse(apiResponse: any, downloadUrl?: string) {
  if (apiResponse && typeof apiResponse === "object") {
    if (apiResponse.expires_at) return new Date(apiResponse.expires_at).toISOString();
    if (apiResponse.expires_in) {
      return new Date(Date.now() + Number(apiResponse.expires_in) * 1000).toISOString();
    }
    if (apiResponse.expires) {
      const v = String(apiResponse.expires);
      const m = v.match(/(\d+)\s*h/i);
      if (m) return new Date(Date.now() + Number(m[1]) * 3600 * 1000).toISOString();
    }
  }

  if (downloadUrl) {
    try {
      const u = new URL(downloadUrl);
      const keys = ["expires", "expires_at", "dstime", "exp"];
      for (const k of keys) {
        if (u.searchParams.has(k)) {
          const v = u.searchParams.get(k);
          if (/^\d+$/.test(v!) && (v!.length >= 9)) {
            const epoch = parseInt(v!, 10);
            const dt = new Date((epoch < 1e12 ? epoch * 1000 : epoch));
            return dt.toISOString();
          }
          const m = v!.match(/(\d+)\s*h/i);
          if (m) return new Date(Date.now() + Number(m[1]) * 3600 * 1000).toISOString();
        }
      }
    } catch (e) { /* ignore */ }
  }

  return new Date(Date.now() + 8 * 3600 * 1000).toISOString();
}

async function trySpecificProxy(originalUrl: string, proxy: any) {
  try {
    let res;
    if (proxy.method === "GET") {
      const q = `${BASE_URL}${proxy.url}?${proxy.type === "query" ? `${proxy.field}=${encodeURIComponent(originalUrl)}` : ''}`;
      res = await fetch(q, { method: 'GET' });
    } else {
      const body = proxy.type === "json" ? JSON.stringify({ [proxy.field]: originalUrl }) : `${proxy.field}=${encodeURIComponent(originalUrl)}`;
      const headers = proxy.type === "json" ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/x-www-form-urlencoded' };
      res = await fetch(`${BASE_URL}${proxy.url}`, { method: 'POST', headers, body });
    }

    if (!res.ok) {
      console.warn(`[proxy ${proxy.name}] returned ${res.status}`);
      return null;
    }

    let j: any;
    try {
      j = await res.json();
    } catch (e) {
      const text = await res.text();
      j = { rawText: text };
    }

    // Extract download link using same logic as tryProxiesForDownload
    const linkCandidates = [
      j?.download_link, j?.downloadUrl, j?.download_url, j?.file, j?.file_url, j?.link, j?.url
    ].filter(Boolean);

    if (!linkCandidates.length && j) {
      for (const k of Object.keys(j)) {
        if (typeof j[k] === 'string' && (j[k].includes('terabox') || j[k].includes('dm-d.terabox') || j[k].match(/\.mp4(\?|$)/i))) {
          linkCandidates.push(j[k]);
        } else if (typeof j[k] === 'object' && j[k]) {
          const nested = j[k];
          if (nested.download_url || nested.download_link || nested.url) {
            linkCandidates.push(nested.download_url || nested.download_link || nested.url);
            Object.assign(j, nested);
          }
          for (const k2 of Object.keys(nested)) {
            if (typeof nested[k2] === 'string' && nested[k2].includes('terabox')) {
              linkCandidates.push(nested[k2]);
            }
          }
        }
      }
    }

    if (linkCandidates.length) {
      const download_url = linkCandidates[0];
      const expires_at = parseExpiryFromResponse(j, download_url);
      const size = j?.size || j?.filesize || j?.file_size || j?.length ||
                  j?.data?.size || j?.result?.size || null;

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
    console.warn(`[proxy ${proxy.name}] failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  return null;
}

async function tryProxiesForDownload(originalUrl: string) {
  for (const proxy of API_PROXIES) {
    try {
      let res;
      if (proxy.method === "GET") {
        const q = `${BASE_URL}${proxy.url}?${proxy.type === "query" ? `${proxy.field}=${encodeURIComponent(originalUrl)}` : ''}`;
        res = await fetch(q, { method: 'GET' });
      } else {
        const body = proxy.type === "json" ? JSON.stringify({ [proxy.field]: originalUrl }) : `${proxy.field}=${encodeURIComponent(originalUrl)}`;
        const headers = proxy.type === "json" ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'application/x-www-form-urlencoded' };
        res = await fetch(`${BASE_URL}${proxy.url}`, { method: 'POST', headers, body });
      }

      if (!res.ok) {
        console.warn(`[proxy ${proxy.name}] returned ${res.status}`);
        continue;
      }

      let j: any;
      try {
        j = await res.json();
      } catch (e) {
        const text = await res.text();
        j = { rawText: text };
      }

      // heuristics: many proxies respond with e.g. { download_link: "...", file_name: "...", size: "...", expires_in: 28800 }
      // check common fields
      const linkCandidates = [
        j?.download_link, j?.downloadUrl, j?.download_url, j?.file, j?.file_url, j?.link, j?.url
      ].filter(Boolean);

      // also if j has nested result object
      if (!linkCandidates.length && j) {
        for (const k of Object.keys(j)) {
          if (typeof j[k] === 'string' && (j[k].includes('terabox') || j[k].includes('dm-d.terabox') || j[k].match(/\.mp4(\?|$)/i))) {
            linkCandidates.push(j[k]);
          } else if (typeof j[k] === 'object' && j[k]) {
            // Extract nested metadata
            const nested = j[k];
            if (nested.download_url || nested.download_link || nested.url) {
              linkCandidates.push(nested.download_url || nested.download_link || nested.url);
              // Merge nested metadata into main object
              Object.assign(j, nested);
            }
            for (const k2 of Object.keys(nested)) {
              if (typeof nested[k2] === 'string' && nested[k2].includes('terabox')) {
                linkCandidates.push(nested[k2]);
              }
            }
          }
        }
      }

      if (linkCandidates.length) {
        const download_url = linkCandidates[0];
        const expires_at = parseExpiryFromResponse(j, download_url);

        // Enhanced size extraction
        const size = j?.size || j?.filesize || j?.file_size || j?.length ||
                    j?.data?.size || j?.result?.size || null;

        // Enhanced metadata extraction
        const enhancedRaw = {
          ...j,
          title: j?.title || j?.filename || j?.name || j?.file_name || j?.data?.title || j?.result?.title,
          thumbnail: j?.thumbnail || j?.thumb || j?.preview || j?.image || j?.data?.thumbnail || j?.result?.thumbnail,
          description: j?.description || j?.desc || j?.data?.description || j?.result?.description,
          duration: j?.duration || j?.length || j?.time || j?.data?.duration || j?.result?.duration,
          mime_type: j?.mime_type || j?.mimeType || j?.type || j?.data?.type || j?.result?.type,
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
      console.warn(`[proxy ${proxy.name}] failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  return null;
}