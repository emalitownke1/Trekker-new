import type { InsertStkPushTransaction, StkPushTransaction } from "@shared/schema";

export interface StkPushConfig {
  apiUrl: string;
  apiKey: string;
}

export interface StkPushRequest {
  phone: string;
  amount: string;
  account_reference: string;
  description?: string;
}

export interface StkPushResponse {
  success: boolean;
  message?: string;
  checkoutRequestID?: string;
  data?: any;
  error?: string;
  error_code?: string;
  details?: any;
}

export class StkPushService {
  private config: StkPushConfig;

  constructor(config: StkPushConfig) {
    this.config = config;
  }

  async initiatePayment(request: StkPushRequest): Promise<StkPushResponse> {
    try {
      console.log('🔄 Initiating STK Push payment:', {
        phone: request.phone,
        amount: request.amount,
        reference: request.account_reference
      });

      const payload = {
        phone: request.phone,
        amount: request.amount,
        account_reference: request.account_reference,
        description: request.description || 'Bot Approval Payment'
      };

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('📡 STK Push API Response:', responseText);

      if (!response.ok) {
        console.error('❌ STK Push API HTTP Error:', response.status, response.statusText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          error_code: 'HTTP_ERROR'
        };
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Invalid JSON response from STK Push API:', responseText);
        return {
          success: false,
          error: 'Invalid JSON response from payment gateway',
          error_code: 'INVALID_JSON'
        };
      }

      if (responseData.success) {
        console.log('✅ STK Push initiated successfully:', responseData);
        return {
          success: true,
          message: responseData.message || 'Payment initiated successfully',
          checkoutRequestID: responseData.data?.checkoutRequestID || responseData.checkoutRequestID,
          data: responseData.data || responseData
        };
      } else {
        console.log('❌ STK Push failed:', responseData);
        return {
          success: false,
          error: responseData.error || responseData.message || 'Payment initiation failed',
          error_code: responseData.error_code || 'PAYMENT_FAILED',
          details: responseData.details
        };
      }

    } catch (error) {
      console.error('❌ STK Push Service Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        error_code: 'SERVICE_ERROR'
      };
    }
  }

  async verifyPayment(checkoutRequestId: string): Promise<StkPushResponse> {
    try {
      console.log('🔍 Verifying STK Push payment:', checkoutRequestId);
      
      // Note: This would require a separate verify endpoint from SmartPay
      // For now, we'll return a placeholder response
      // In a real implementation, you'd call their verification API
      
      return {
        success: true,
        message: 'Payment verification not yet implemented',
        data: { status: 'pending' }
      };
    } catch (error) {
      console.error('❌ STK Push Verification Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        error_code: 'VERIFICATION_ERROR'
      };
    }
  }

  static getDefaultConfig(): StkPushConfig {
    return {
      apiUrl: process.env.STKPUSH_API_URL || 'https://api.smartpaypesa.com/v1/initiatestk/',
      apiKey: process.env.STKPUSH_API_KEY || 'dac85c2c4078a202ef1c2edf87bcd1dba08bb3867f14de3366efd5722c6e9d33',
    };
  }
}

export const stkPushService = new StkPushService(StkPushService.getDefaultConfig());