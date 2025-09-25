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

      // Handle SmartPay API response format
      if (responseData.success === true || responseData.ResponseCode === "0") {
        console.log('✅ STK Push initiated successfully:', responseData);
        
        // Extract checkout request ID from various possible fields
        const checkoutRequestID = responseData.checkoutRequestID || 
                                  responseData.CheckoutRequestID || 
                                  responseData.data?.checkoutRequestID ||
                                  responseData.data?.CheckoutRequestID;
        
        if (!checkoutRequestID) {
          console.error('❌ No checkout request ID in successful response:', responseData);
          return {
            success: false,
            error: 'Payment initiated but no checkout ID received. Please contact support.',
            error_code: 'MISSING_CHECKOUT_ID'
          };
        }
        
        return {
          success: true,
          message: responseData.message || responseData.ResponseDescription || 'STK Push initiated successfully',
          checkoutRequestID: checkoutRequestID,
          data: {
            ...responseData,
            checkoutRequestID: checkoutRequestID
          }
        };
      } else {
        console.log('❌ STK Push failed:', responseData);
        
        // Handle different error response formats
        let errorMessage = 'Payment initiation failed';
        let errorCode = 'PAYMENT_FAILED';
        
        if (responseData.error) {
          errorMessage = responseData.error;
          errorCode = responseData.error_code || 'API_ERROR';
        } else if (responseData.errorMessage) {
          errorMessage = responseData.errorMessage;
          errorCode = responseData.errorCode || 'API_ERROR';
        } else if (responseData.ResponseDescription) {
          errorMessage = responseData.ResponseDescription;
          errorCode = responseData.ResponseCode || 'MPESA_ERROR';
        }
        
        return {
          success: false,
          error: errorMessage,
          error_code: errorCode,
          details: responseData
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
      const statusUrl = 'https://api.smartpaypesa.com/v1/transactionstatus';
      
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

      // Return the raw response data for frontend parsing
      // This maintains the exact format from the smartpay API documentation
      if (responseData.Body && responseData.Body.stkCallback) {
        const callback = responseData.Body.stkCallback;
        const resultCode = callback.ResultCode;
        
        // Process the callback metadata for easier access
        if (resultCode === 0 && callback.CallbackMetadata) {
          const metadata = callback.CallbackMetadata.Item || [];
          const processedData: any = {
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
                processedData.amount = item.Value?.toString();
                break;
              case 'MpesaReceiptNumber':
                processedData.mpesaReceiptNumber = item.Value;
                break;
              case 'TransactionDate':
                processedData.transactionDate = item.Value?.toString();
                break;
              case 'PhoneNumber':
                processedData.phoneNumber = item.Value?.toString();
                break;
            }
          }

          return {
            success: true,
            message: 'Payment completed successfully',
            data: {
              Body: {
                stkCallback: {
                  ...callback,
                  processed: processedData
                }
              }
            }
          };
        } else {
          // Payment failed - return raw response for frontend error handling
          return {
            success: true,
            message: 'Transaction completed with error',
            data: responseData
          };
        }
      } else if (responseData.ResponseCode) {
        // Handle direct response format
        return {
          success: true,
          message: responseData.ResponseCode === "0" ? 'Transaction still pending' : 'Transaction failed',
          data: responseData
        };
      } else {
        // Transaction might still be pending - return raw response
        return {
          success: true,
          message: 'Transaction status pending',
          data: responseData
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
    const apiUrl = process.env.STKPUSH_API_URL || 'https://api.smartpaypesa.com/v1/initiatestk/';
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