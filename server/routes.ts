import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBeatSchema, insertCartItemSchema, insertPurchaseSchema, insertLikeSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const audioDir = path.join(uploadsDir, 'audio');
  const imagesDir = path.join(uploadsDir, 'images');
  const stemsDir = path.join(uploadsDir, 'stems');
  
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(stemsDir)) fs.mkdirSync(stemsDir, { recursive: true });

  // Multer configuration
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'audio' || file.fieldname === 'beatTag') {
        cb(null, audioDir);
      } else if (file.fieldname === 'artwork') {
        cb(null, imagesDir);
      } else if (file.fieldname === 'stems') {
        cb(null, stemsDir);
      } else {
        cb(new Error('Invalid field name'), '');
      }
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const upload = multer({ 
    storage: storage_config,
    limits: {
      fileSize: 1024 * 1024 * 1024, // 1GB limit for stems, will handle per-field later
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
      } else if (file.fieldname === 'artwork') {
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

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(uploadsDir));

  // File upload endpoint
  app.post('/api/upload', isAuthenticated, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'artwork', maxCount: 1 },
    { name: 'stems', maxCount: 1 },
    { name: 'beatTag', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const uploadedFiles: { [key: string]: string } = {};

      if (files.audio && files.audio[0]) {
        uploadedFiles.audioUrl = `/uploads/audio/${files.audio[0].filename}`;
      }

      if (files.artwork && files.artwork[0]) {
        uploadedFiles.artworkUrl = `/uploads/images/${files.artwork[0].filename}`;
      }

      if (files.stems && files.stems[0]) {
        uploadedFiles.stemsUrl = `/uploads/stems/${files.stems[0].filename}`;
      }

      if (files.beatTag && files.beatTag[0]) {
        uploadedFiles.beatTagUrl = `/uploads/audio/${files.beatTag[0].filename}`;
      }

      res.json(uploadedFiles);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  // Profile image upload endpoint
  app.post('/api/upload/profile-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const type = req.body.type; // 'profile' or 'banner'
      
      if (!file) {
        return res.status(400).json({ message: 'No image file provided' });
      }
      
      if (!['profile', 'banner'].includes(type)) {
        return res.status(400).json({ message: 'Invalid image type' });
      }
      
      const imageUrl = `/uploads/images/${file.filename}`;
      
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
      const userId = req.user.claims.sub;
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
      await storage.incrementPlayCount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing play count:", error);
      res.status(500).json({ message: "Failed to increment play count" });
    }
  });

  app.post('/api/beats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const beatData = insertBeatSchema.parse({
        ...req.body,
        producerId: userId,
      });

      const beat = await storage.createBeat(beatData);
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
      const userId = req.user.claims.sub;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post('/api/cart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        userId,
      });

      const cartItem = await storage.addToCart(cartItemData);
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Like routes
  app.post('/api/beats/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
