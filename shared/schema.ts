import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const mediaItems = sqliteTable("media_items", {
  id: text("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  type: text("type", { enum: ["video", "folder"] }).notNull().default("video"),
  duration: integer("duration"), // in seconds
  size: integer("size"), // in bytes
  downloadUrl: text("download_url"),
  downloadExpiresAt: integer("download_expires_at", { mode: "timestamp" }),
  downloadFetchedAt: integer("download_fetched_at", { mode: "timestamp" }),
  scrapedAt: integer("scraped_at", { mode: "timestamp" }),
  error: text("error"),
  folderVideoCount: integer("folder_video_count").default(0),
  folderImageCount: integer("folder_image_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("primary"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const mediaItemTags = sqliteTable("media_item_tags", {
  id: text("id").primaryKey(),
  mediaItemId: text("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const mediaItemCategories = sqliteTable("media_item_categories", {
  id: text("id").primaryKey(),
  mediaItemId: text("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
});

export const apiOptions = sqliteTable("api_options", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method", { enum: ["GET", "POST"] }).notNull().default("POST"),
  type: text("type", { enum: ["json", "query"] }).notNull().default("json"),
  field: text("field").notNull(),
  status: text("status", { enum: ["available", "limited", "offline"] }).notNull().default("available"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertMediaItemTagSchema = createInsertSchema(mediaItemTags).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertMediaItemCategorySchema = createInsertSchema(mediaItemCategories).omit({
  id: true,
});

export const insertApiOptionSchema = createInsertSchema(apiOptions).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type MediaItem = typeof mediaItems.$inferSelect;
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type MediaItemTag = typeof mediaItemTags.$inferSelect;
export type InsertMediaItemTag = z.infer<typeof insertMediaItemTagSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MediaItemCategory = typeof mediaItemCategories.$inferSelect;
export type InsertMediaItemCategory = z.infer<typeof insertMediaItemCategorySchema>;

export type ApiOption = typeof apiOptions.$inferSelect;
export type InsertApiOption = z.infer<typeof insertApiOptionSchema>;

// Extended types for frontend
export type MediaItemWithTagsAndCategories = MediaItem & {
  tags: Tag[];
  categories: Category[];
};

export type MediaSearchParams = {
  search?: string;
  tags?: string[];
  categories?: string[];
  type?: "video" | "folder";
  sizeRange?: "small" | "medium" | "large";
  page?: number;
  limit?: number;
};
