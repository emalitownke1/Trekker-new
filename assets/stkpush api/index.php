<?php
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SmartPay STK Push</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-light: #6366f1;
      --success: #10b981;
      --error: #ef4444;
      --dark: #1f2937;
      --light: #f9fafb;
      --gray: #6b7280;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    
    .payment-container {
      width: 100%;
      max-width: 500px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      animation: fadeIn 0.5s ease-out;
    }
    
    .payment-header {
      background: var(--primary);
      color: white;
      padding: 24px;
      text-align: center;
      position: relative;
    }
    
    .payment-header h2 {
      font-weight: 600;
      font-size: 1.8rem;
    }
    
    .payment-header::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 0;
      right: 0;
      height: 20px;
      background: white;
      border-radius: 0 0 50% 50%;
    }
    
    .payment-logo {
      width: 60px;
      height: 60px;
      background: white;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 auto 15px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .payment-logo i {
      color: var(--primary);
      font-size: 28px;
    }
    
    .payment-form {
      padding: 30px;
    }
    
    .form-group {
      margin-bottom: 20px;
      position: relative;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--dark);
      font-weight: 500;
      font-size: 14px;
    }
    
    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s;
      background-color: #f9fafb;
    }
    
    .form-control:focus {
      outline: none;
      border-color: var(--primary-light);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
      background-color: white;
    }
    
    .form-control[readonly] {
      background-color: #f3f4f6;
      color: var(--gray);
    }
    
    .submit-btn {
      width: 100%;
      padding: 14px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .submit-btn:hover {
      background: var(--primary-light);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    
    .submit-btn:active {
      transform: translateY(0);
    }
    
    .submit-btn i {
      margin-right: 8px;
    }
    
    .response-box {
      margin-top: 20px;
      padding: 16px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
      animation: fadeIn 0.5s ease-out;
    }
    
    .success-message {
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .error-message {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--error);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .payment-footer {
      text-align: center;
      padding: 20px;
      color: var(--gray);
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .input-icon {
      position: absolute;
      right: 15px;
      top: 38px;
      color: var(--gray);
    }
    
    /* Loading spinner */
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
      margin-right: 8px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .hidden {
      display: none;
    }
  </style>
</head>
<body>

  <div class="payment-container">
    <div class="payment-header">
      <div class="payment-logo">
        <i class="fas fa-bolt"></i>
      </div>
      <h2>SmartPay STK Push</h2>
    </div>
    
    <div class="payment-form">
      <form id="paymentForm">
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="text" id="phone" name="phone" class="form-control" required placeholder="2547XXXXXXXX" />
          <i class="fas fa-mobile-alt input-icon"></i>
        </div>
        
        <div class="form-group">
          <label for="amount">Amount (KES)</label>
          <input type="number" id="amount" name="amount" class="form-control" value="100" required placeholder="100" />
          <i class="fas fa-money-bill-wave input-icon"></i>
        </div>
        
        <div class="form-group">
          <label for="account_reference">Account Reference</label>
          <input type="text" id="account_reference" name="account_reference" class="form-control" value="This will be returned in callback" />
          <i class="fas fa-user-tag input-icon"></i>
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <input type="text" id="description" name="description" class="form-control" value="description for payment | can be left blank" />
          <i class="fas fa-info-circle input-icon"></i>
        </div>
        
        <button type="submit" class="submit-btn" id="submitBtn">
          <i class="fas fa-paper-plane"></i> Initiate Payment
        </button>
      </form>
      
      <div class="response-box hidden" id="responseBox"></div>
    </div>
    
    <div class="payment-footer">
      <p>Secured by SmartPay | <i class="fas fa-lock"></i> 256-bit SSL Encryption</p>
    </div>
  </div>

  <script>
    document.getElementById("paymentForm").addEventListener("submit", async function(e) {
      e.preventDefault();
      
      const form = e.target;
      const formData = new FormData(form);
      const responseBox = document.getElementById("responseBox");
      const submitBtn = document.getElementById("submitBtn");
      
      // Show loading state
      submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
      submitBtn.disabled = true;
      
      // Hide previous messages
      responseBox.classList.add('hidden');
      
      try {
        const response = await fetch("processpayment.php", {
          method: "POST",
          body: formData
        });

        const contentType = response.headers.get("content-type");

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();

          responseBox.classList.remove('hidden');
          
          if (data.success === true) {
            responseBox.innerHTML = `
              <div class="success-message">
                <i class="fas fa-check-circle"></i> ${data.message || 'Payment initiated successfully!'}
                <div style="margin-top: 10px; font-size: 12px;">Check your phone to complete the payment</div>
              </div>
            `;
          } else {
            responseBox.innerHTML = `
              <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> <strong>${data.message || 'Payment failed'}</strong>
                ${data.details ? `<div style="margin-top: 6px;"><strong>Details:</strong> ${data.details}</div>` : ''}
                ${data.error_code ? `<div><strong>Error Code:</strong> ${data.error_code}</div>` : ''}
                ${data.raw_response ? `<pre style="margin-top: 8px; font-size: 11px; background: #111; color: #0f0; padding: 10px; overflow: auto;">${JSON.stringify(data.raw_response, null, 2)}</pre>` : ''}
              </div>
            `;
          }

        } else {
          const raw = await response.text();
          responseBox.classList.remove('hidden');
          responseBox.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-triangle"></i> Unexpected Response (not JSON):<br>
              <pre style="margin-top: 8px; font-size: 12px;">${raw}</pre>
            </div>
          `;
        }

      } catch (error) {
        responseBox.classList.remove('hidden');
        responseBox.innerHTML = `
          <div class="error-message">
            <i class="fas fa-bug"></i> Error: ${error.message}
          </div>
        `;
        console.error("JS Fetch error:", error);
      } finally {
        // Reset button state
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Initiate Payment';
        submitBtn.disabled = false;
      }
    });
  </script>

</body>
</html>