import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2, CreditCard, Check, AlertCircle, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StkPushPaymentModalProps {
  open: boolean;
  onClose: () => void;
  phoneNumber?: string;
  botInstanceId?: string;
  amount?: number;
  onPaymentSuccess?: (transactionData: any) => void;
}

export default function StkPushPaymentModal({ 
  open, 
  onClose, 
  phoneNumber = "",
  botInstanceId,
  amount = 100,
  onPaymentSuccess 
}: StkPushPaymentModalProps) {
  const { toast } = useToast();
  const [paymentPhone, setPaymentPhone] = useState(phoneNumber);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success' | 'failed'>('form');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string>('');
  const [transactionData, setTransactionData] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  // Initiate STK Push payment
  const initiatePaymentMutation = useMutation({
    mutationFn: async (paymentData: { phoneNumber: string; amount: number; botInstanceId?: string }) => {
      const response = await fetch('/api/guest/stkpush/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: paymentData.phoneNumber,
          amount: paymentData.amount,
          botInstanceId: paymentData.botInstanceId,
          description: 'WhatsApp Bot Approval Payment'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate payment');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Payment initiated successfully:', data);
      
      // Use the correct field name from the API response
      const checkoutId = data.checkoutRequestId || data.checkoutRequestID || data.CheckoutRequestID;
      
      if (!checkoutId) {
        console.error('No checkout request ID in response:', data);
        setPaymentStep('failed');
        toast({
          title: "Payment Error",
          description: "Invalid response from payment gateway",
          variant: "destructive"
        });
        return;
      }
      
      setCheckoutRequestId(checkoutId);
      setTransactionData({ ...data, checkoutRequestId: checkoutId });
      setPaymentStep('processing');
      
      // Store checkout request ID in localStorage
      localStorage.setItem('stkpush_checkout_id', checkoutId);
      localStorage.setItem('stkpush_phone', paymentPhone);
      localStorage.setItem('stkpush_amount', amount.toString());
      
      // Check if this is demo mode
      const isDemoMode = checkoutId?.startsWith('MOCK_') || data.message?.includes('Demo') || data.message?.includes('simulated');
      
      if (isDemoMode) {
        toast({
          title: "Demo Payment",
          description: "Payment simulation started - will auto-complete in 10 seconds",
        });
        
        // Auto-complete demo payment after 10 seconds
        setTimeout(() => {
          setPaymentStep('success');
          setTransactionData({
            ...data,
            status: 'completed',
            amount: amount.toString(),
            mpesaReceiptNumber: `DEMO${Date.now()}`,
            transactionDate: new Date().toISOString()
          });
        }, 10000);
      } else {
        toast({
          title: "Payment Initiated",
          description: "Check your phone for M-Pesa payment prompt",
        });

        // Start polling for payment status
        startPaymentStatusPolling(checkoutId);
      }
    },
    onError: (error: Error) => {
      console.error('Payment initiation failed:', error);
      setPaymentStep('failed');
      
      let errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('Invalid API key')) {
        errorMessage = "Payment system not configured. Please contact administrator (+254704897825) to enable M-Pesa payments.";
      } else if (error.message.includes('Phone number must be in format')) {
        errorMessage = "Please enter a valid Safaricom number starting with 254 (e.g., 254712345678)";
      } else if (error.message.includes('Network error')) {
        errorMessage = "Network connection failed. Please check your internet and try again.";
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Check payment status
  const checkPaymentStatusMutation = useMutation({
    mutationFn: async (checkoutRequestId: string) => {
      if (!checkoutRequestId) {
        throw new Error('Checkout request ID is missing');
      }
      
      console.log('Checking status for checkout ID:', checkoutRequestId);
      
      const response = await fetch('/api/guest/stkpush/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkoutRequestId: checkoutRequestId,
          phoneNumber: paymentPhone
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Status check HTTP error:', response.status, error);
        throw new Error(error.message || 'Failed to check payment status');
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('Payment status:', data);
      
      if (data.status === 'completed') {
        setPaymentStep('success');
        setTransactionData(data);
        
        // Store successful payment data in localStorage
        localStorage.setItem('stkpush_success', JSON.stringify(data));
        localStorage.setItem('stkpush_approved_bot', botInstanceId || '');
        
        toast({
          title: "Payment Successful!",
          description: "Your bot has been approved and activated",
        });

        if (onPaymentSuccess) {
          onPaymentSuccess(data);
        }
      } else if (data.status === 'failed') {
        setPaymentStep('failed');
        toast({
          title: "Payment Failed",
          description: data.resultDesc || "Transaction was not completed successfully",
          variant: "destructive"
        });
      }
      // If still pending, continue polling
    },
    onError: (error: Error) => {
      console.error('Payment status check failed:', error);
      // Don't show error toast for every failed status check, as it's expected during polling
    }
  });

  // Poll payment status every 3 seconds
  const startPaymentStatusPolling = (checkoutId: string) => {
    if (!checkoutId) {
      console.error('Cannot start polling without checkout ID');
      setPaymentStep('failed');
      return;
    }
    
    console.log('Starting payment status polling for:', checkoutId);
    let pollAttempts = 0;
    
    const pollInterval = setInterval(() => {
      pollAttempts++;
      setPollCount(pollAttempts);
      
      // Stop polling after 2 minutes (40 polls * 3 seconds)
      if (pollAttempts >= 40) {
        clearInterval(pollInterval);
        setPaymentStep('failed');
        toast({
          title: "Payment Timeout",
          description: "Payment verification timed out. Please contact support with reference: " + checkoutId.slice(-8),
          variant: "destructive"
        });
        return;
      }
      
      // Stop polling if payment is complete
      if (paymentStep === 'success' || paymentStep === 'failed') {
        clearInterval(pollInterval);
        return;
      }
      
      checkPaymentStatusMutation.mutate(checkoutId);
    }, 3000);
    
    // Store interval reference to clear it on component unmount
    return pollInterval;
  };

  const handleInitiatePayment = () => {
    const cleanedPhone = paymentPhone.replace(/[\s\-\(\)\+]/g, '');
    
    // Validate phone number format
    if (!cleanedPhone || cleanedPhone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }
    
    // Ensure it starts with 254 for Kenyan numbers
    let formattedPhone = cleanedPhone;
    if (cleanedPhone.startsWith('0')) {
      formattedPhone = '254' + cleanedPhone.substring(1);
    } else if (cleanedPhone.startsWith('7') || cleanedPhone.startsWith('1')) {
      formattedPhone = '254' + cleanedPhone;
    }
    
    // Validate final format
    if (!/^254\d{9}$/.test(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Safaricom number (e.g., 0712345678 or 254712345678)",
        variant: "destructive"
      });
      return;
    }

    initiatePaymentMutation.mutate({
      phoneNumber: formattedPhone,
      amount: amount,
      botInstanceId: botInstanceId
    });
  };

  const handleRetry = () => {
    setPaymentStep('form');
    setPollCount(0);
    setCheckoutRequestId('');
    setTransactionData(null);
  };

  const handleClose = () => {
    // Clear any polling intervals
    setPollCount(0);
    setPaymentStep('form');
    setCheckoutRequestId('');
    setTransactionData(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Bot Approval Payment
          </DialogTitle>
        </DialogHeader>

        {/* Payment Form */}
        {paymentStep === 'form' && (
          <div className="space-y-4">
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800">Pay to Approve Bot</CardTitle>
                <CardDescription className="text-green-600">
                  Complete payment to activate your WhatsApp bot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Amount:</span>
                    <div className="text-lg font-bold text-green-600">KSh {amount}</div>
                  </div>
                  <div>
                    <span className="font-medium">Service:</span>
                    <div className="text-sm">Bot Approval</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentPhone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    M-Pesa Phone Number
                  </Label>
                  <Input
                    id="paymentPhone"
                    data-testid="input-payment-phone"
                    placeholder="254700000000"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value.replace(/[\s\-\(\)]/g, ''))}
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your M-Pesa phone number to receive payment prompt
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleInitiatePayment}
              data-testid="button-approve-bot"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
              disabled={initiatePaymentMutation.isPending}
            >
              {initiatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay KSh {amount} & Approve Bot
                </>
              )}
            </Button>
          </div>
        )}

        {/* Processing Payment */}
        {paymentStep === 'processing' && (
          <div className="space-y-4 text-center py-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
              <p className="text-muted-foreground mb-4">
                Check your phone for M-Pesa payment prompt and enter your PIN
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Payment request sent to {paymentPhone}. Please complete the M-Pesa transaction on your phone.
                </AlertDescription>
              </Alert>
            </div>
            <div className="text-sm text-muted-foreground">
              Transaction ID: {checkoutRequestId?.slice(0, 8)}...
            </div>
          </div>
        )}

        {/* Payment Success */}
        {paymentStep === 'success' && (
          <div className="space-y-4 text-center py-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Successful!</h3>
              <p className="text-muted-foreground mb-4">
                Your bot has been approved and is now active
              </p>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Amount Paid:</span>
                      <span className="font-medium">KSh {transactionData?.amount}</span>
                    </div>
                    {transactionData?.mpesaReceiptNumber && (
                      <div className="flex justify-between">
                        <span>Receipt:</span>
                        <span className="font-medium">{transactionData.mpesaReceiptNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium text-green-600">Approved</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Button onClick={handleClose} className="w-full" data-testid="button-payment-complete">
              Continue to Bot Management
            </Button>
          </div>
        )}

        {/* Payment Failed */}
        {paymentStep === 'failed' && (
          <div className="space-y-4 text-center py-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Failed</h3>
              <p className="text-muted-foreground mb-4">
                The payment could not be completed. Please try again.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={handleRetry} variant="outline" className="w-full" data-testid="button-retry-payment">
                Try Again
              </Button>
              <Button onClick={handleClose} variant="ghost" className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}