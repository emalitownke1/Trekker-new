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

      // Check if API key is configured (use the real API key now)
      if (!this.config.apiKey || this.config.apiKey === 'demo_key_requires_configuration') {
        console.warn('⚠️ STKPUSH_API_KEY not configured - using demo mode');
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
      
      // Use the actual transaction status endpoint
      const statusUrl = 'https://api.smartpay.co.ke/v1/transactionstatus';
      
      const payload = {
        CheckoutRequestID: checkoutRequestId
      };

      const response = await fetch(statusUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('📡 STK Push Status API Response:', responseText);

      if (!response.ok) {
        console.error('❌ STK Push Status API HTTP Error:', response.status, response.statusText);
        return {
          success: false,
          error: `Status check failed (${response.status})`,
          error_code: 'HTTP_ERROR'
        };
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Invalid JSON response from STK Push Status API:', responseText);
        return {
          success: false,
          error: 'Invalid response from payment gateway',
          error_code: 'INVALID_JSON'
        };
      }

      // Handle the response format from the documentation
      if (responseData.Body && responseData.Body.stkCallback) {
        const callback = responseData.Body.stkCallback;
        const resultCode = callback.ResultCode;
        
        if (resultCode === 0) {
          // Payment successful
          const metadata = callback.CallbackMetadata?.Item || [];
          const paymentData: any = {
            status: 'completed',
            resultCode: resultCode.toString(),
            resultDesc: callback.ResultDesc,
            merchantRequestId: callback.MerchantRequestID,
            checkoutRequestId: callback.CheckoutRequestID
          };

          // Extract payment details from metadata
          for (const item of metadata) {
            switch (item.Name) {
              case 'Amount':
                paymentData.amount = item.Value?.toString();
                break;
              case 'MpesaReceiptNumber':
                paymentData.mpesaReceiptNumber = item.Value;
                break;
              case 'TransactionDate':
                paymentData.transactionDate = item.Value?.toString();
                break;
              case 'PhoneNumber':
                paymentData.phoneNumber = item.Value?.toString();
                break;
            }
          }

          return {
            success: true,
            message: 'Payment completed successfully',
            data: paymentData
          };
        } else {
          // Payment failed or cancelled
          let errorMessage = callback.ResultDesc || 'Payment failed';
          
          // Map common error codes to user-friendly messages
          switch (resultCode) {
            case 1032:
              errorMessage = 'Payment cancelled by user';
              break;
            case 1037:
              errorMessage = 'Request timeout - unable to reach user';
              break;
            case 1025:
              errorMessage = 'Error occurred while sending payment request';
              break;
            case 1:
              errorMessage = 'Insufficient balance for the transaction';
              break;
            case 1019:
              errorMessage = 'Transaction has expired';
              break;
            case 1001:
              errorMessage = 'Another transaction is already in process';
              break;
          }

          return {
            success: false,
            error: errorMessage,
            error_code: resultCode.toString(),
            data: {
              status: 'failed',
              resultCode: resultCode.toString(),
              resultDesc: callback.ResultDesc
            }
          };
        }
      } else if (responseData.ResponseCode) {
        // Handle direct error response format
        const responseCode = responseData.ResponseCode;
        if (responseCode === "0") {
          return {
            success: true,
            message: 'Transaction still pending',
            data: { status: 'pending' }
          };
        } else {
          return {
            success: false,
            error: responseData.ResponseDescription || 'Payment verification failed',
            error_code: responseCode,
            data: { status: 'failed' }
          };
        }
      } else {
        // Transaction might still be pending
        return {
          success: true,
          message: 'Transaction status pending',
          data: { status: 'pending' }
        };
      }
      
    } catch (error) {
      console.error('❌ STK Push Verification Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  static getDefaultConfig(): StkPushConfig {
    // Use environment variables if available, otherwise use the provided API key
    const apiUrl = process.env.STKPUSH_API_URL || 'https://api.smartpay.co.ke/v1/initiatestk/';
    const apiKey = process.env.STKPUSH_API_KEY || '99c46858a64d21c3e01a14d99353e4f2310845579961daa0f9c5adad53803a40';
    
    if (!process.env.STKPUSH_API_KEY) {
      console.log('🔑 Using configured API key for STK Push payments');
    }
    
    return {
      apiUrl,
      apiKey,
    };
  }
}

export const stkPushService = new StkPushService(StkPushService.getDefaultConfig());