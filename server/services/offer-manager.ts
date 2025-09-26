import { storage } from "../storage";
import { getServerName } from "../db";
import { OfferManagement, InsertOfferManagement } from "@shared/schema";

interface ParsedOffer {
  days: number;
  months: number;
  isValid: boolean;
}

export class OfferManager {
  private static instance: OfferManager;
  private currentOffer: OfferManagement | null = null;
  private countdownInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Singleton pattern
    if (OfferManager.instance) {
      return OfferManager.instance;
    }
    OfferManager.instance = this;
  }

  /**
   * Parse OFFER environment variable format: "12d 2m", "30d 0m", "false"
   */
  private parseOfferConfig(offerConfig: string): ParsedOffer {
    if (!offerConfig || offerConfig.toLowerCase() === 'false') {
      return { days: 0, months: 0, isValid: false };
    }

    // Match pattern like "12d 2m" or "30d" or "2m"
    const match = offerConfig.match(/(?:(\d+)d)?\s*(?:(\d+)m)?/i);
    
    if (!match) {
      console.warn(`⚠️ Invalid OFFER format: ${offerConfig}. Expected format: "12d 2m" or "false"`);
      return { days: 0, months: 0, isValid: false };
    }

    const days = parseInt(match[1] || '0', 10);
    const months = parseInt(match[2] || '0', 10);

    if (days === 0 && months === 0) {
      console.warn(`⚠️ OFFER config has zero duration: ${offerConfig}`);
      return { days: 0, months: 0, isValid: false };
    }

    return { days, months, isValid: true };
  }

  /**
   * Calculate end time based on days and months
   */
  private calculateEndTime(days: number, months: number): Date {
    const now = new Date();
    const endTime = new Date(now);
    
    // Add months first
    if (months > 0) {
      endTime.setMonth(endTime.getMonth() + months);
    }
    
    // Add days
    if (days > 0) {
      endTime.setDate(endTime.getDate() + days);
    }
    
    return endTime;
  }

  /**
   * Initialize offer system on server startup
   */
  async initializeOfferSystem(): Promise<void> {
    console.log('🎁 Initializing offer system...');
    
    const serverName = getServerName();
    const offerConfig = process.env.OFFER;

    if (!offerConfig) {
      console.log('🎁 No OFFER environment variable found - offers disabled');
      return;
    }

    const parsedOffer = this.parseOfferConfig(offerConfig);
    
    if (!parsedOffer.isValid) {
      console.log(`🎁 OFFER disabled (config: ${offerConfig})`);
      await this.deactivateCurrentOffer();
      return;
    }

    // Check if there's already an active offer for this configuration
    const existingOffer = await storage.getCurrentOffer(serverName);
    
    if (existingOffer && existingOffer.offerConfig === offerConfig) {
      // Same offer config - check if it's still valid
      if (existingOffer.endTime && new Date() < new Date(existingOffer.endTime)) {
        console.log(`🎁 Resuming existing offer: ${existingOffer.offerName} (ends: ${existingOffer.endTime})`);
        this.currentOffer = existingOffer;
        this.startCountdownMonitoring();
        return;
      } else {
        // Offer expired - deactivate it
        console.log(`🎁 Existing offer expired: ${existingOffer.offerName}`);
        await storage.updateOffer(existingOffer.id, { isActive: false });
      }
    }

    // Create new offer
    const startTime = new Date();
    const endTime = this.calculateEndTime(parsedOffer.days, parsedOffer.months);

    const newOfferData: InsertOfferManagement = {
      offerName: `Special Offer - ${parsedOffer.days}d ${parsedOffer.months}m`,
      isActive: true,
      offerConfig: offerConfig,
      durationDays: parsedOffer.days,
      durationMonths: parsedOffer.months,
      startTime: startTime,
      endTime: endTime,
      serverName: serverName
    };

    this.currentOffer = await storage.createOffer(newOfferData);
    
    console.log(`🎁 New offer created: ${this.currentOffer.offerName}`);
    console.log(`🎁 Offer duration: ${parsedOffer.days} days, ${parsedOffer.months} months`);
    console.log(`🎁 Offer ends: ${endTime.toISOString()}`);
    
    this.startCountdownMonitoring();
  }

  /**
   * Start monitoring countdown to automatically deactivate expired offers
   */
  private startCountdownMonitoring(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Check every minute if offer has expired
    this.countdownInterval = setInterval(async () => {
      if (!this.currentOffer || !this.currentOffer.endTime) return;

      const now = new Date();
      const endTime = new Date(this.currentOffer.endTime);

      if (now >= endTime) {
        console.log(`🎁 Offer expired: ${this.currentOffer.offerName}`);
        await this.deactivateCurrentOffer();
      }
    }, 60000); // Check every minute

    console.log('🎁 Countdown monitoring started');
  }

  /**
   * Deactivate current offer
   */
  private async deactivateCurrentOffer(): Promise<void> {
    if (this.currentOffer) {
      await storage.updateOffer(this.currentOffer.id, { isActive: false });
      console.log(`🎁 Offer deactivated: ${this.currentOffer.offerName}`);
      this.currentOffer = null;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
      console.log('🎁 Countdown monitoring stopped');
    }
  }

  /**
   * Check if there's an active offer
   */
  async isOfferActive(): Promise<boolean> {
    if (!this.currentOffer) {
      this.currentOffer = await storage.getCurrentOffer() || null;
    }

    if (!this.currentOffer || !this.currentOffer.endTime) {
      return false;
    }

    const now = new Date();
    const endTime = new Date(this.currentOffer.endTime);
    
    return now < endTime;
  }

  /**
   * Get current offer information
   */
  async getCurrentOfferInfo(): Promise<{
    isActive: boolean;
    offer?: OfferManagement;
    timeRemaining?: {
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    };
  }> {
    const isActive = await this.isOfferActive();
    
    if (!isActive || !this.currentOffer) {
      return { isActive: false };
    }

    const now = new Date();
    const endTime = new Date(this.currentOffer.endTime!);
    const timeDiff = endTime.getTime() - now.getTime();
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    return {
      isActive: true,
      offer: this.currentOffer,
      timeRemaining: { days, hours, minutes, seconds }
    };
  }

  /**
   * Force refresh offer configuration (useful for config changes)
   */
  async refreshOfferConfig(): Promise<void> {
    console.log('🎁 Refreshing offer configuration...');
    this.currentOffer = null;
    await this.initializeOfferSystem();
  }

  /**
   * Cleanup on server shutdown
   */
  cleanup(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    console.log('🎁 Offer manager cleanup completed');
  }
}

// Export singleton instance
export const offerManager = new OfferManager();