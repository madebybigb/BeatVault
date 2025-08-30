import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { b2Service } from "./b2Service";
import { insertBeatSchema, insertCartItemSchema, insertPurchaseSchema, insertLikeSchema, insertPaymentSessionSchema, insertWebhookEventSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { jobs } from "./backgroundJobs";
import { apiBatcher } from "./apiBatching";
import { redisService } from "./redis";
import { initializeWebSocket, getWebSocketService } from "./websocket";
import { dodoPaymentsService } from "./dodoPayments";
import { searchService } from "./searchService";
import { audioService } from "./audioService";
import { cdnService } from "./cdnService";
import { Webhook } from "standardwebhooks";
import type { SearchFilters } from "@shared/schema";

// Utility functions for validation
const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const validateUUID = (id: string, res: any, fieldName = 'ID'): boolean => {
  if (!id || typeof id !== 'string' || !isValidUUID(id)) {
    res.status(400).json({ message: `Invalid ${fieldName} format` });
    return false;
  }
  return true;
};

// Performance monitoring middleware
function queryTimer(label: string) {
  const start = Date.now();
  return () => {
    const duration = Date.now() - start;
    console.log(`[PERF] ${label}: ${duration}ms`);
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] ${label} took ${duration}ms`);
    }
  };
}

// Rate limiting middleware
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 uploads per minute
  message: "Too many uploads, please try again later.",
});

// Slow down middleware for expensive operations
const searchSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes at full speed
  delayMs: () => 100, // slow down subsequent requests by 100ms per request
  maxDelayMs: 2000, // maximum delay of 2 seconds
  validate: { delayMs: false }, // Disable warning
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Redis connection
  await redisService.connect();
  
  // Apply general rate limiting to all routes
  app.use(generalLimiter);
  
  // Auth middleware
  await setupAuth(app);

  // Note: We now use BackBlaze B2 for file storage instead of local uploads

  // Multer configuration for memory storage (files will be uploaded to B2)
  const storage_config = multer.memoryStorage();

  const upload = multer({ 
    storage: storage_config,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit for individual files
    },
    fileFilter: (req, file, cb) => {
      if (file.fieldname === 'audio' || file.fieldname === 'beatTag') {
        const allowedTypes = /\.(mp3|wav|flac|m4a)$/i;
        if (allowedTypes.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error('Audio files only (mp3, wav, flac, m4a)'));
        }
      } else if (file.fieldname === 'stems') {
        const allowedTypes = /\.(zip|rar)$/i;
        if (allowedTypes.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error('Stems files must be in ZIP or RAR format'));
        }
      } else if (file.fieldname === 'artwork' || file.fieldname === 'image') {
        const allowedTypes = /\.(jpg|jpeg|png|webp)$/i;
        if (allowedTypes.test(file.originalname)) {
          cb(null, true);
        } else {
          cb(new Error('Image files only (jpg, jpeg, png, webp)'));
        }
      } else {
        cb(new Error('Invalid field name'));
      }
    }
  });

  // Note: Static file serving removed - files are now served from BackBlaze B2

  // File upload endpoint using BackBlaze B2
  app.post('/api/upload', isAuthenticated, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'artwork', maxCount: 1 },
    { name: 'stems', maxCount: 1 },
    { name: 'beatTag', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const uploadedFiles: { [key: string]: string } = {};

      // Upload audio file to B2
      if (files.audio && files.audio[0]) {
        const audioFile = files.audio[0];
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(audioFile.originalname)}`;
        const audioUrl = await b2Service.uploadFile(fileName, audioFile.buffer, audioFile.mimetype, 'audio');
        uploadedFiles.audioUrl = audioUrl;
      }

      // Upload artwork to B2
      if (files.artwork && files.artwork[0]) {
        const artworkFile = files.artwork[0];
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(artworkFile.originalname)}`;
        const artworkUrl = await b2Service.uploadFile(fileName, artworkFile.buffer, artworkFile.mimetype, 'images');
        uploadedFiles.artworkUrl = artworkUrl;
      }

      // Upload stems to B2
      if (files.stems && files.stems[0]) {
        const stemsFile = files.stems[0];
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(stemsFile.originalname)}`;
        const stemsUrl = await b2Service.uploadFile(fileName, stemsFile.buffer, stemsFile.mimetype, 'stems');
        uploadedFiles.stemsUrl = stemsUrl;
      }

      // Upload beat tag to B2
      if (files.beatTag && files.beatTag[0]) {
        const beatTagFile = files.beatTag[0];
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(beatTagFile.originalname)}`;
        const beatTagUrl = await b2Service.uploadFile(fileName, beatTagFile.buffer, beatTagFile.mimetype, 'audio');
        uploadedFiles.beatTagUrl = beatTagUrl;
      }

      res.json(uploadedFiles);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  // Profile image upload endpoint using BackBlaze B2
  app.post('/api/upload/profile-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const file = req.file;
      const type = req.body.type; // 'profile' or 'banner'
      
      if (!file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      if (!['profile', 'banner'].includes(type)) {
        return res.status(400).json({ message: 'Invalid image type' });
      }
      
      // Upload to B2
      const fileName = `${type}-${userId}-${Date.now()}${path.extname(file.originalname)}`;
      const imageUrl = await b2Service.uploadFile(fileName, file.buffer, file.mimetype, 'images');
      
      // Update user profile with new image URL
      const updateData = type === 'profile' 
        ? { profileImageUrl: imageUrl }
        : { bannerImageUrl: imageUrl };
        
      await storage.updateUser(userId, updateData);
      
      res.json({ 
        success: true, 
        imageUrl,
        type 
      });
    } catch (error) {
      console.error('Profile image upload error:', error);
      res.status(500).json({ message: 'Profile image upload failed' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Beat routes
  app.get('/api/beats', async (req, res) => {
    try {
      const { 
        genre, 
        mood, 
        priceMin, 
        priceMax, 
        search, 
        isFree, 
        limit = 20, 
        offset = 0 
      } = req.query;

      const filters = {
        genre: genre as string,
        mood: mood as string,
        priceMin: priceMin ? parseFloat(priceMin as string) : undefined,
        priceMax: priceMax ? parseFloat(priceMax as string) : undefined,
        search: search as string,
        isFree: isFree === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const beats = await storage.getBeats(filters);
      res.json(beats);
    } catch (error) {
      console.error("Error fetching beats:", error);
      res.status(500).json({ message: "Failed to fetch beats" });
    }
  });

  app.get('/api/beats/trending', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const beats = await storage.getTrendingBeats(parseInt(limit as string));
      res.json(beats);
    } catch (error) {
      console.error("Error fetching trending beats:", error);
      res.status(500).json({ message: "Failed to fetch trending beats" });
    }
  });

  app.get('/api/beats/popular', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const beats = await storage.getPopularBeats(parseInt(limit as string));
      res.json(beats);
    } catch (error) {
      console.error("Error fetching popular beats:", error);
      res.status(500).json({ message: "Failed to fetch popular beats" });
    }
  });

  app.get('/api/beats/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate UUID format
      if (!validateUUID(id, res, 'beat ID')) return;
      
      const beat = await storage.getBeat(id);
      if (!beat) {
        return res.status(404).json({ message: "Beat not found" });
      }
      res.json(beat);
    } catch (error) {
      console.error("Error fetching beat:", error);
      res.status(500).json({ message: "Failed to fetch beat" });
    }
  });

  app.post('/api/beats/:id/play', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate UUID format
      if (!validateUUID(id, res, 'beat ID')) return;
      
      await storage.incrementPlayCount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing play count:", error);
      res.status(500).json({ message: "Failed to increment play count" });
    }
  });

  app.post('/api/beats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const beatData = insertBeatSchema.parse({
        ...req.body,
        producerId: userId,
      });

      const beat = await storage.createBeat(beatData);
      
      // Queue audio processing jobs
      if (beat.audioUrl) {
        audioService.processUploadedAudio(beat.id, beat.audioUrl);
      }
      
      res.status(201).json(beat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid beat data", errors: error.errors });
      }
      console.error("Error creating beat:", error);
      res.status(500).json({ message: "Failed to create beat" });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get('/api/user/:id/beats', async (req, res) => {
    try {
      const { id } = req.params;
      const beats = await storage.getBeatsByProducer(id);
      res.json(beats);
    } catch (error) {
      console.error("Error fetching user beats:", error);
      res.status(500).json({ message: "Failed to fetch user beats" });
    }
  });

  // Cart routes
  app.get('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        userId,
      });

      const cartItem = await storage.addToCart(cartItemData);
      
      // Invalidate cart cache and send real-time notification
      await redisService.del(`cart:${userId}`);
      jobs.sendNotification('cart_add', userId, { beatId: cartItemData.beatId });
      
      // Send real-time notification via WebSocket
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendNotificationToUser(userId, {
          type: 'cart_add',
          message: 'Beat added to cart',
          beatId: cartItemData.beatId
        });
      }
      
      res.status(201).json(cartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid cart item data", errors: error.errors });
      }
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.delete('/api/cart/:beatId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const { beatId } = req.params;
      
      const success = await storage.removeFromCart(userId, beatId);
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.delete('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Wishlist routes
  app.get('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const wishlistItems = await storage.getWishlistItems(userId);
      res.json(wishlistItems);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const { beatId } = req.body;
      
      const wishlistItem = await storage.addToWishlist({ userId, beatId });
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete('/api/wishlist/:beatId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const { beatId } = req.params;
      
      const success = await storage.removeFromWishlist(userId, beatId);
      if (!success) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  // Collections routes
  app.get('/api/collections', async (req, res) => {
    try {
      const collections = await storage.getCollections();
      res.json(collections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.get('/api/collections/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const collection = await storage.getCollection(id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  // Advanced Search routes
  app.get('/api/search', searchSlowDown, async (req, res) => {
    try {
      const timer = queryTimer('Advanced Search');
      
      const filters: SearchFilters = {
        query: req.query.q as string,
        genre: req.query.genre as string,
        mood: req.query.mood as string,
        bpmMin: req.query.bpmMin ? parseInt(req.query.bpmMin as string) : undefined,
        bpmMax: req.query.bpmMax ? parseInt(req.query.bpmMax as string) : undefined,
        key: req.query.key as string,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        duration: {
          min: req.query.durationMin ? parseInt(req.query.durationMin as string) : undefined,
          max: req.query.durationMax ? parseInt(req.query.durationMax as string) : undefined
        },
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        isFree: req.query.isFree ? req.query.isFree === 'true' : undefined,
        isExclusive: req.query.isExclusive ? req.query.isExclusive === 'true' : undefined,
        producerId: req.query.producerId as string,
        sortBy: req.query.sortBy as any || 'relevance',
        limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };

      // Get user ID if authenticated
      let userId: string | undefined;
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && req.user?.sub) {
          userId = req.user.sub;
        }
      } catch (error) {
        // Non-authenticated search is allowed
      }

      const results = await searchService.search(filters, userId);
      timer();
      
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.get('/api/search/suggestions', async (req, res) => {
    try {
      const query = req.query.q as string;
      const suggestions = await searchService.getSearchSuggestions(query);
      res.json(suggestions);
    } catch (error) {
      console.error('Search suggestions error:', error);
      res.status(500).json({ message: 'Failed to get suggestions' });
    }
  });

  app.get('/api/search/autocomplete', async (req, res) => {
    try {
      const query = req.query.q as string;
      const categories = req.query.categories ? (req.query.categories as string).split(',') : ['beat', 'producer', 'genre'];
      
      if (!query || query.length < 2) {
        return res.json({ beats: [], producers: [], genres: [], tags: [] });
      }

      const results = await searchService.getAutocomplete(query, categories);
      res.json(results);
    } catch (error) {
      console.error('Autocomplete error:', error);
      res.status(500).json({ message: 'Autocomplete failed' });
    }
  });

  app.get('/api/search/trending', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const trending = await searchService.getTrendingSearches(limit);
      res.json(trending);
    } catch (error) {
      console.error('Trending searches error:', error);
      res.status(500).json({ message: 'Failed to get trending searches' });
    }
  });

  app.get('/api/beats/:id/similar', async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!validateUUID(id, res, 'beat ID')) return;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const similarBeats = await searchService.findSimilarBeats(id, limit);
      res.json(similarBeats);
    } catch (error) {
      console.error('Similar beats error:', error);
      res.status(500).json({ message: 'Failed to find similar beats' });
    }
  });

  // Audio Streaming and Processing routes
  app.get('/api/audio/:beatId/metadata', async (req, res) => {
    try {
      const { beatId } = req.params;
      
      if (!validateUUID(beatId, res, 'beat ID')) return;
      
      const metadata = await audioService.getAudioMetadata(beatId);
      if (!metadata) {
        return res.status(404).json({ message: 'Audio metadata not found' });
      }
      
      res.json(metadata);
    } catch (error) {
      console.error('Audio metadata error:', error);
      res.status(500).json({ message: 'Failed to get audio metadata' });
    }
  });

  app.get('/api/audio/:beatId/cdn-urls', async (req, res) => {
    try {
      const { beatId } = req.params;
      
      if (!validateUUID(beatId, res, 'beat ID')) return;
      
      const urls = await audioService.getCDNUrls(beatId);
      if (!urls) {
        return res.status(404).json({ message: 'Audio URLs not found' });
      }
      
      res.json(urls);
    } catch (error) {
      console.error('CDN URLs error:', error);
      res.status(500).json({ message: 'Failed to get CDN URLs' });
    }
  });

  app.post('/api/audio/:beatId/generate-waveform', isAuthenticated, async (req: any, res) => {
    try {
      const { beatId } = req.params;
      
      if (!validateUUID(beatId, res, 'beat ID')) return;
      
      // Get beat to ensure it exists and user has access
      const beat = await storage.getBeat(beatId);
      if (!beat) {
        return res.status(404).json({ message: 'Beat not found' });
      }
      
      // Check if user owns the beat
      const userId = req.user.sub;
      if (beat.producerId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const waveformUrl = await audioService.generateWaveform(beatId, beat.audioUrl);
      if (!waveformUrl) {
        return res.status(500).json({ message: 'Waveform generation failed' });
      }
      
      res.json({ waveformUrl });
    } catch (error) {
      console.error('Waveform generation error:', error);
      res.status(500).json({ message: 'Failed to generate waveform' });
    }
  });

  app.post('/api/audio/preload', async (req, res) => {
    try {
      const { beatIds } = req.body;
      
      if (!Array.isArray(beatIds) || beatIds.length === 0) {
        return res.status(400).json({ message: 'Beat IDs required' });
      }
      
      // Validate all beat IDs
      for (const id of beatIds) {
        if (!isValidUUID(id)) {
          return res.status(400).json({ message: `Invalid beat ID: ${id}` });
        }
      }
      
      const preloadUrls = await audioService.preloadAudio(beatIds.slice(0, 20)); // Limit to 20 beats
      res.json(preloadUrls);
    } catch (error) {
      console.error('Audio preload error:', error);
      res.status(500).json({ message: 'Failed to preload audio' });
    }
  });

  app.post('/api/audio/:beatId/streaming-analytics', isAuthenticated, async (req: any, res) => {
    try {
      const { beatId } = req.params;
      const userId = req.user.sub;
      const { duration, quality, bufferingEvents, completionRate } = req.body;
      
      if (!validateUUID(beatId, res, 'beat ID')) return;
      
      await audioService.trackAudioStreaming(beatId, userId, {
        duration,
        quality,
        bufferingEvents,
        completionRate
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Streaming analytics error:', error);
      res.status(500).json({ message: 'Failed to track streaming analytics' });
    }
  });

  // CDN and Streaming Optimization routes
  app.get('/api/cdn/optimize/:beatId', async (req, res) => {
    try {
      const { beatId } = req.params;
      const quality = (req.query.quality as 'high' | 'medium' | 'low') || 'high';
      const userRegion = req.query.region as string || 'us-east';
      
      if (!validateUUID(beatId, res, 'beat ID')) return;
      
      // Get beat audio URL
      const beat = await storage.getBeat(beatId);
      if (!beat) {
        return res.status(404).json({ message: 'Beat not found' });
      }
      
      // Optimize for CDN
      const optimized = await cdnService.optimizeAudioForCDN(beat.audioUrl, quality);
      const regionalUrl = cdnService.getRegionalCDNUrl(optimized.cdnUrl, userRegion);
      
      res.json({
        ...optimized,
        regionalUrl,
        analytics: await cdnService.getCDNAnalytics(beat.audioUrl)
      });
    } catch (error) {
      console.error('CDN optimization error:', error);
      res.status(500).json({ message: 'Failed to optimize for CDN' });
    }
  });

  app.get('/api/cdn/streaming/:beatId', async (req, res) => {
    try {
      const { beatId } = req.params;
      
      if (!validateUUID(beatId, res, 'beat ID')) return;
      
      const beat = await storage.getBeat(beatId);
      if (!beat) {
        return res.status(404).json({ message: 'Beat not found' });
      }
      
      // Generate adaptive streaming URLs
      const streamingUrls = await cdnService.generateAdaptiveStreamingUrls(beat.audioUrl);
      
      res.json(streamingUrls);
    } catch (error) {
      console.error('Streaming URLs error:', error);
      res.status(500).json({ message: 'Failed to generate streaming URLs' });
    }
  });

  app.post('/api/cdn/preload', async (req, res) => {
    try {
      const { beatIds } = req.body;
      
      if (!Array.isArray(beatIds) || beatIds.length === 0) {
        return res.status(400).json({ message: 'Beat IDs required' });
      }
      
      // Validate beat IDs
      for (const id of beatIds) {
        if (!isValidUUID(id)) {
          return res.status(400).json({ message: `Invalid beat ID: ${id}` });
        }
      }
      
      // Get beat URLs
      const beats = await storage.getBeats({ 
        filters: { isActive: true }, 
        limit: beatIds.length,
        offset: 0 
      });
      
      const audioUrls = beats.beats
        .filter(beat => beatIds.includes(beat.id))
        .map(beat => beat.audioUrl);
      
      // Preload to edge cache
      await cdnService.preloadToEdgeCache(audioUrls);
      
      res.json({ 
        success: true, 
        preloaded: audioUrls.length,
        message: `${audioUrls.length} assets preloaded to edge cache` 
      });
    } catch (error) {
      console.error('CDN preload error:', error);
      res.status(500).json({ message: 'Failed to preload assets' });
    }
  });

  app.post('/api/cdn/invalidate', isAuthenticated, async (req: any, res) => {
    try {
      const { assetPaths } = req.body;
      const userId = req.user.sub;
      
      if (!Array.isArray(assetPaths) || assetPaths.length === 0) {
        return res.status(400).json({ message: 'Asset paths required' });
      }
      
      // Only allow users to invalidate their own content
      // In a real implementation, you'd verify ownership
      await cdnService.invalidateCache(assetPaths);
      
      res.json({ 
        success: true, 
        invalidated: assetPaths.length,
        message: `${assetPaths.length} cache entries invalidated` 
      });
    } catch (error) {
      console.error('Cache invalidation error:', error);
      res.status(500).json({ message: 'Failed to invalidate cache' });
    }
  });

  // Like routes
  app.post('/api/beats/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const { id: beatId } = req.params;

      const like = await storage.likeBeats({ userId, beatId });
      res.status(201).json(like);
    } catch (error) {
      console.error("Error liking beat:", error);
      res.status(500).json({ message: "Failed to like beat" });
    }
  });

  app.delete('/api/beats/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const { id: beatId } = req.params;

      const success = await storage.unlikeBeat(userId, beatId);
      if (!success) {
        return res.status(404).json({ message: "Like not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error unliking beat:", error);
      res.status(500).json({ message: "Failed to unlike beat" });
    }
  });

  app.get('/api/user/likes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const likes = await storage.getUserLikes(userId);
      res.json(likes);
    } catch (error) {
      console.error("Error fetching user likes:", error);
      res.status(500).json({ message: "Failed to fetch user likes" });
    }
  });

  // Purchase routes
  app.post('/api/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const purchaseData = insertPurchaseSchema.parse({
        ...req.body,
        userId,
      });

      const purchase = await storage.createPurchase(purchaseData);
      
      // Clear cart items for purchased beats
      if (req.body.beatIds && Array.isArray(req.body.beatIds)) {
        for (const beatId of req.body.beatIds) {
          await storage.removeFromCart(userId, beatId);
        }
      }

      res.status(201).json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      }
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  app.get('/api/purchases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const purchases = await storage.getPurchasesByUser(userId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.get('/api/producer/sales', isAuthenticated, async (req: any, res) => {
    try {
      const producerId = req.user.claims.sub;
      const sales = await storage.getPurchasesByProducer(producerId);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  // Payment routes
  app.post('/api/checkout/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.sub;
      const userEmail = req.user.claims.email || `user_${userId}@example.com`;
      const userName = req.user.claims.name || `User ${userId}`;

      // Get user's cart items with beat details
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Get beat details for each cart item
      const cartWithBeats = await Promise.all(
        cartItems.map(async (item) => {
          const beat = await storage.getBeat(item.beatId);
          if (!beat) {
            throw new Error(`Beat not found: ${item.beatId}`);
          }
          return { item, beat };
        })
      );

      // Create checkout session with Dodo Payments
      const checkout = await dodoPaymentsService.createCheckoutSession(
        userId,
        cartWithBeats,
        {
          email: userEmail,
          name: userName,
        }
      );

      res.json(checkout);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get('/api/payment/session/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.sub;

      if (!validateUUID(sessionId, res, 'Session ID')) return;

      const session = await storage.getPaymentSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Payment session not found" });
      }

      // Ensure user can only access their own sessions
      if (session.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error fetching payment session:", error);
      res.status(500).json({ message: "Failed to fetch payment session" });
    }
  });

  // Webhook endpoint for Dodo Payments
  app.post('/api/webhooks/dodo', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const webhookSecret = process.env.DODO_WEBHOOK_KEY;
      if (!webhookSecret) {
        console.error('DODO_WEBHOOK_KEY not configured');
        return res.status(500).json({ message: "Webhook secret not configured" });
      }

      const webhook = new Webhook(webhookSecret);
      const rawBody = req.body.toString();
      
      const webhookHeaders = {
        "webhook-id": req.headers["webhook-id"] as string || "",
        "webhook-signature": req.headers["webhook-signature"] as string || "",
        "webhook-timestamp": req.headers["webhook-timestamp"] as string || "",
      };

      // Verify webhook signature
      await webhook.verify(rawBody, webhookHeaders);
      const payload = JSON.parse(rawBody);

      // Check if we've already processed this event
      const existingEvent = await storage.getWebhookEvent(payload.id || payload.event_id);
      if (existingEvent && existingEvent.processed) {
        return res.status(200).json({ message: "Event already processed" });
      }

      // Store webhook event
      const webhookEvent = await storage.createWebhookEvent({
        eventId: payload.id || payload.event_id,
        eventType: payload.type || payload.event_type,
        payload: payload,
        processed: false,
      });

      // Process the webhook based on event type
      try {
        switch (payload.type || payload.event_type) {
          case 'payment.succeeded':
            const paymentId = payload.data?.payment_id || payload.payment_id;
            if (paymentId) {
              await dodoPaymentsService.processSuccessfulPayment(paymentId);
              console.log(`Successfully processed payment: ${paymentId}`);
            }
            break;

          case 'payment.failed':
            const failedPaymentId = payload.data?.payment_id || payload.payment_id;
            if (failedPaymentId) {
              await dodoPaymentsService.processFailedPayment(failedPaymentId);
              console.log(`Processed failed payment: ${failedPaymentId}`);
            }
            break;

          default:
            console.log(`Unhandled webhook event type: ${payload.type || payload.event_type}`);
        }

        // Mark webhook as processed
        await storage.markWebhookProcessed(payload.id || payload.event_id);
        
      } catch (processingError) {
        console.error('Error processing webhook:', processingError);
        await storage.markWebhookProcessed(
          payload.id || payload.event_id, 
          processingError instanceof Error ? processingError.message : 'Unknown error'
        );
      }

      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      res.status(400).json({ message: "Webhook verification failed" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  initializeWebSocket(httpServer);
  
  return httpServer;
}
