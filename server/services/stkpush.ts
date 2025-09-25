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

      // Validate phone number format
      const cleanPhone = request.phone.replace(/[\s\-\(\)\+]/g, '');
      if (!/^254\d{9}$/.test(cleanPhone)) {
        return {
          success: false,
          error: 'Phone number must be in format 254XXXXXXXXX',
          error_code: 'INVALID_PHONE_FORMAT'
        };
      }

      const payload = {
        phone: cleanPhone,
        amount: request.amount,
        account_reference: request.account_reference,
        description: request.description || 'Bot Approval Payment'
      };

      // Check if API key is configured
      if (!this.config.apiKey || this.config.apiKey === 'dac85c2c4078a202ef1c2edf87bcd1dba08bb3867f14de3366efd5722c6e9d33') {
        console.warn('⚠️ Using demo API key - payment will be simulated');
        // Return a simulated success response for demo purposes
        const mockCheckoutId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          success: true,
          message: 'Demo payment initiated successfully (simulated)',
          checkoutRequestID: mockCheckoutId,
          data: {
            checkoutRequestID: mockCheckoutId,
            responseDescription: 'Demo payment - simulated success'
          }
        };
      }

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('📡 STK Push API Response:', responseText);

      if (!response.ok) {
        console.error('❌ STK Push API HTTP Error:', response.status, response.statusText);
        
        // Handle specific error codes
        if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please contact administrator to configure payment system.',
            error_code: 'INVALID_API_KEY'
          };
        }
        
        if (response.status === 403) {
          return {
            success: false,
            error: 'API key does not have permission for STK Push. Please contact administrator.',
            error_code: 'INSUFFICIENT_PERMISSIONS'
          };
        }

        return {
          success: false,
          error: `Payment service error (${response.status}). Please try again or contact support.`,
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
          error: 'Invalid response from payment gateway. Please try again.',
          error_code: 'INVALID_JSON'
        };
      }

      if (responseData.success || responseData.ResponseCode === "0") {
        console.log('✅ STK Push initiated successfully:', responseData);
        return {
          success: true,
          message: responseData.message || responseData.ResponseDescription || 'Payment initiated successfully',
          checkoutRequestID: responseData.data?.checkoutRequestID || responseData.CheckoutRequestID,
          data: responseData.data || responseData
        };
      } else {
        console.log('❌ STK Push failed:', responseData);
        const errorMessage = responseData.error || responseData.errorMessage || responseData.ResponseDescription || 'Payment initiation failed';
        return {
          success: false,
          error: errorMessage,
          error_code: responseData.error_code || responseData.errorCode || responseData.ResponseCode || 'PAYMENT_FAILED',
          details: responseData.details
        };
      }

    } catch (error) {
      console.error('❌ STK Push Service Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error. Please check your internet connection.',
        error_code: 'NETWORK_ERROR'
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
    // Use environment variables if available, otherwise use demo values
    const apiUrl = process.env.STKPUSH_API_URL || 'https://api.smartpaypesa.com/v1/initiatestk/';
    const apiKey = process.env.STKPUSH_API_KEY || 'demo_key_requires_configuration';
    
    if (!process.env.STKPUSH_API_KEY) {
      console.warn('⚠️ STKPUSH_API_KEY not configured - using demo mode');
    }
    
    return {
      apiUrl,
      apiKey,
    };
  }
}

export const stkPushService = new StkPushService(StkPushService.getDefaultConfig());