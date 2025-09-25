
export interface StkPushStoredData {
  transactionId: string;
  phoneNumber: string;
  timestamp: string;
  amount: string;
  status?: 'pending' | 'completed' | 'failed';
  completedAt?: string;
  failedAt?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  failureReason?: string;
}

export class StkPushUtils {
  private static STORAGE_KEY = 'stkdata';

  /**
   * Get all stored STK Push transactions
   */
  static getAllTransactions(): Record<string, StkPushStoredData> {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Get a specific transaction by checkout request ID
   */
  static getTransaction(checkoutRequestId: string): StkPushStoredData | null {
    const allTransactions = this.getAllTransactions();
    return allTransactions[checkoutRequestId] || null;
  }

  /**
   * Save or update a transaction
   */
  static saveTransaction(checkoutRequestId: string, data: StkPushStoredData): void {
    const allTransactions = this.getAllTransactions();
    allTransactions[checkoutRequestId] = data;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allTransactions));
  }

  /**
   * Update transaction status
   */
  static updateTransactionStatus(
    checkoutRequestId: string, 
    status: 'pending' | 'completed' | 'failed',
    additionalData?: Partial<StkPushStoredData>
  ): void {
    const transaction = this.getTransaction(checkoutRequestId);
    if (transaction) {
      const updatedTransaction = {
        ...transaction,
        status,
        ...additionalData
      };

      if (status === 'completed') {
        updatedTransaction.completedAt = new Date().toISOString();
      } else if (status === 'failed') {
        updatedTransaction.failedAt = new Date().toISOString();
      }

      this.saveTransaction(checkoutRequestId, updatedTransaction);
    }
  }

  /**
   * Get pending transactions (older than 5 minutes are considered expired)
   */
  static getPendingTransactions(): Array<{ id: string; data: StkPushStoredData }> {
    const allTransactions = this.getAllTransactions();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return Object.entries(allTransactions)
      .filter(([_, data]) => {
        const isNotCompleted = !data.status || data.status === 'pending';
        const isNotExpired = new Date(data.timestamp) > fiveMinutesAgo;
        return isNotCompleted && isNotExpired;
      })
      .map(([id, data]) => ({ id, data }));
  }

  /**
   * Check transaction status via API
   */
  static async checkTransactionStatus(checkoutRequestId: string): Promise<{
    success: boolean;
    status?: 'pending' | 'completed' | 'failed';
    data?: any;
    error?: string;
  }> {
    try {
      console.log('🔍 Checking transaction status for:', checkoutRequestId);
      
      const response = await fetch('/api/guest/stkpush/transaction-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          CheckoutRequestID: checkoutRequestId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to check transaction status'
        };
      }

      const data = await response.json();
      
      // Parse response according to smartpay documentation
      if (data.Body && data.Body.stkCallback) {
        const callback = data.Body.stkCallback;
        const resultCode = callback.ResultCode;
        
        if (resultCode === 0) {
          // Transaction completed successfully
          const metadata = callback.CallbackMetadata?.Item || [];
          const paymentDetails: any = {
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
                paymentDetails.amount = item.Value?.toString();
                break;
              case 'MpesaReceiptNumber':
                paymentDetails.mpesaReceiptNumber = item.Value;
                break;
              case 'TransactionDate':
                paymentDetails.transactionDate = item.Value?.toString();
                break;
              case 'PhoneNumber':
                paymentDetails.phoneNumber = item.Value?.toString();
                break;
            }
          }

          // Update localStorage
          this.updateTransactionStatus(checkoutRequestId, 'completed', paymentDetails);

          return {
            success: true,
            status: 'completed',
            data: paymentDetails
          };
        } else {
          // Transaction failed
          const failureData = {
            status: 'failed',
            resultCode: resultCode.toString(),
            resultDesc: callback.ResultDesc || 'Transaction failed'
          };

          // Update localStorage
          this.updateTransactionStatus(checkoutRequestId, 'failed', {
            failureReason: failureData.resultDesc
          });

          return {
            success: true,
            status: 'failed',
            data: failureData
          };
        }
      } else {
        // Transaction still pending or unknown status
        return {
          success: true,
          status: 'pending',
          data: data
        };
      }

    } catch (error) {
      console.error('❌ Transaction status check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Clean up old transactions (older than 24 hours)
   */
  static cleanupOldTransactions(): void {
    const allTransactions = this.getAllTransactions();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const filteredTransactions = Object.fromEntries(
      Object.entries(allTransactions).filter(([_, data]) => {
        return new Date(data.timestamp) > oneDayAgo;
      })
    );

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTransactions));
  }
}
