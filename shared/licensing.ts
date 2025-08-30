import { z } from 'zod';

export const licenseTypeSchema = z.enum(['basic', 'premium', 'exclusive']);
export type LicenseType = z.infer<typeof licenseTypeSchema>;

export interface LicenseDetails {
  type: LicenseType;
  name: string;
  description: string;
  price: number;
  features: string[];
  limitations: {
    commercialUse: boolean;
    distributionLimit?: number;
    creditRequired: boolean;
    exclusivity: boolean;
    stemFiles: boolean;
    radioBroadcast: boolean;
    musicVideos: boolean;
    streaming: boolean;
  };
}

export const LICENSE_TIERS: Record<LicenseType, LicenseDetails> = {
  basic: {
    type: 'basic',
    name: 'Basic License',
    description: 'Perfect for non-commercial projects and demos',
    price: 29.99,
    features: [
      'MP3 file (320kbps)',
      'Non-commercial use only',
      'Upload to streaming platforms',
      'Basic mixing/editing rights',
      'Producer credit required'
    ],
    limitations: {
      commercialUse: false,
      distributionLimit: 5000,
      creditRequired: true,
      exclusivity: false,
      stemFiles: false,
      radioBroadcast: false,
      musicVideos: true,
      streaming: true,
    }
  },
  premium: {
    type: 'premium',
    name: 'Premium License',
    description: 'Commercial use with extended rights',
    price: 99.99,
    features: [
      'WAV + MP3 files',
      'Commercial use allowed',
      'Radio broadcast rights',
      'Stem files included',
      'Advanced mixing rights',
      'Music video rights'
    ],
    limitations: {
      commercialUse: true,
      distributionLimit: 50000,
      creditRequired: true,
      exclusivity: false,
      stemFiles: true,
      radioBroadcast: true,
      musicVideos: true,
      streaming: true,
    }
  },
  exclusive: {
    type: 'exclusive',
    name: 'Exclusive License',
    description: 'Complete ownership with unlimited commercial rights',
    price: 499.99,
    features: [
      'All file formats (WAV, MP3, stems)',
      'Unlimited commercial use',
      'Full ownership rights',
      'No producer credit required',
      'Beat removed from sale',
      'Unlimited distribution',
      'Sync licensing rights'
    ],
    limitations: {
      commercialUse: true,
      distributionLimit: undefined,
      creditRequired: false,
      exclusivity: true,
      stemFiles: true,
      radioBroadcast: true,
      musicVideos: true,
      streaming: true,
    }
  }
};

export const purchaseSchema = z.object({
  id: z.string().uuid(),
  beatId: z.string().uuid(),
  userId: z.string(),
  licenseType: licenseTypeSchema,
  price: z.number().min(0),
  paymentMethod: z.enum(['stripe', 'paypal']),
  transactionId: z.string(),
  purchaseDate: z.date(),
  downloadCount: z.number().default(0),
  maxDownloads: z.number().default(5),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export type Purchase = z.infer<typeof purchaseSchema>;

export const insertPurchaseSchema = purchaseSchema.omit({ 
  id: true, 
  purchaseDate: true,
  downloadCount: true 
});

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

// Utility functions for license management
export function calculateLicensePrice(basePrice: number, licenseType: LicenseType): number {
  const multipliers = {
    basic: 1,
    premium: 3.5,
    exclusive: 16.5
  };
  
  return Math.max(basePrice * multipliers[licenseType], LICENSE_TIERS[licenseType].price);
}

export function canDownload(purchase: Purchase): boolean {
  if (purchase.maxDownloads === -1) return true; // Unlimited
  return purchase.downloadCount < purchase.maxDownloads;
}

export function hasExpired(purchase: Purchase): boolean {
  if (!purchase.expiresAt) return false;
  return new Date() > purchase.expiresAt;
}

export function getLicenseFeatures(licenseType: LicenseType): string[] {
  return LICENSE_TIERS[licenseType].features;
}

export function getLicenseLimitations(licenseType: LicenseType) {
  return LICENSE_TIERS[licenseType].limitations;
}