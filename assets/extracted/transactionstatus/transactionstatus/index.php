<?php ?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>STK Push Status | SmartPay</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
  <style>
    :root {
      --primary: #4f46e5;
      --primary-light: #6366f1;
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
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
    
    .status-container {
      width: 100%;
      max-width: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      animation: fadeIn 0.5s ease-out;
    }
    
    .status-header {
      background: var(--primary);
      color: white;
      padding: 24px;
      text-align: center;
      position: relative;
    }
    
    .status-header h2 {
      font-weight: 600;
      font-size: 1.8rem;
    }
    
    .status-header::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 0;
      right: 0;
      height: 20px;
      background: white;
      border-radius: 0 0 50% 50%;
    }
    
    .status-logo {
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
    
    .status-logo i {
      color: var(--primary);
      font-size: 28px;
    }
    
    .status-form {
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
      animation: fadeIn 0.5s ease-out;
      display: none;
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
    
    .pending-message {
      background-color: rgba(245, 158, 11, 0.1);
      color: var(--warning);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .status-footer {
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
    
    .json-response {
      margin-top: 15px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid var(--primary);
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .transaction-details {
      margin-top: 15px;
      padding: 0;
      list-style: none;
    }
    
    .transaction-details li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
    }
    
    .transaction-details li:last-child {
      border-bottom: none;
    }
    
    .transaction-details strong {
      color: var(--dark);
    }
  </style>
</head>
<body>

  <div class="status-container">
    <div class="status-header">
      <div class="status-logo">
        <i class="fas fa-search-dollar"></i>
      </div>
      <h2>STK Push Status</h2>
    </div>
    
    <div class="status-form">
      <form id="statusForm">
        <div class="form-group">
          <label for="checkout_request_id">Checkout Request ID</label>
          <input type="text" id="checkout_request_id" name="checkout_request_id" class="form-control" required placeholder="ws_CO_15062025163001857727856009" />
          <i class="fas fa-receipt input-icon"></i>
        </div>
        
        <button type="submit" class="submit-btn" id="submitBtn">
          <i class="fas fa-search"></i> Check Status
        </button>
      </form>
      
      <div class="response-box" id="responseBox"></div>
    </div>
    
    <div class="status-footer">
      <p>Secured by SmartPay | <i class="fas fa-lock"></i> 256-bit SSL Encryption</p>
    </div>
  </div>

  <script>
    document.getElementById("statusForm").addEventListener("submit", async function(e) {
      e.preventDefault();
      
      const form = e.target;
      const formData = new FormData(form);
      const responseBox = document.getElementById("responseBox");
      const submitBtn = document.getElementById("submitBtn");
      
      // Show loading state
      submitBtn.innerHTML = '<span class="spinner"></span> Checking...';
      submitBtn.disabled = true;
      
      // Hide previous messages
      responseBox.style.display = 'none';
      
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

          responseBox.style.display = 'block';
          
          if (data.Body?.stkCallback?.ResultCode == 0) {
            // Success response
            const callback = data.Body.stkCallback;
            const metadata = callback.CallbackMetadata?.Item || [];
            
            // Extract metadata values
            const metadataMap = {};
            metadata.forEach(item => {
              metadataMap[item.Name] = item.Value;
            });
            
            responseBox.innerHTML = `
              <div class="success-message">
                <i class="fas fa-check-circle"></i> Payment Successful
                <ul class="transaction-details">
                  <li><strong>Amount:</strong> KES ${metadataMap.Amount || 'N/A'}</li>
                  <li><strong>Receipt No:</strong> ${metadataMap.MpesaReceiptNumber || 'N/A'}</li>
                  <li><strong>Phone:</strong> ${metadataMap.PhoneNumber || 'N/A'}</li>
                  <li><strong>Date:</strong> ${formatDate(metadataMap.TransactionDate)}</li>
                  <li><strong>Reference:</strong> ${metadataMap.AccountReference || callback.MerchantRequestID}</li>
                </ul>
                <div class="json-response">${JSON.stringify(data, null, 2)}</div>
              </div>
            `;
          } else if (data.response_code == 1032 || data.Body?.stkCallback?.ResultCode == 1032) {
            // Cancelled by user
            responseBox.innerHTML = `
              <div class="error-message">
                <i class="fas fa-times-circle"></i> Payment Cancelled
                <p>${data.Body?.stkCallback?.ResultDesc || data.message || 'Request cancelled by user'}</p>
                <div class="json-response">${JSON.stringify(data, null, 2)}</div>
              </div>
            `;
          } else if (data.response_code == 1037 || data.Body?.stkCallback?.ResultCode == 1037) {
            // Timeout
            responseBox.innerHTML = `
              <div class="error-message">
                <i class="fas fa-clock"></i> Payment Timeout
                <p>${data.Body?.stkCallback?.ResultDesc || data.message || 'DS timeout user cannot be reached'}</p>
                <div class="json-response">${JSON.stringify(data, null, 2)}</div>
              </div>
            `;
          } else if (data.error || data.message) {
            // Error response
            responseBox.innerHTML = `
              <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> ${data.error || data.message}
                ${data.details ? `<p>${data.details}</p>` : ''}
                <div class="json-response">${JSON.stringify(data, null, 2)}</div>
              </div>
            `;
          } else {
            // Unknown response format
            responseBox.innerHTML = `
              <div class="pending-message">
                <i class="fas fa-info-circle"></i> Payment Status Unknown
                <div class="json-response">${JSON.stringify(data, null, 2)}</div>
              </div>
            `;
          }
          
        } else {
          const raw = await response.text();
          responseBox.style.display = 'block';
          responseBox.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-triangle"></i> Unexpected Response (not JSON):<br>
              <div class="json-response">${raw}</div>
            </div>
          `;
        }

      } catch (error) {
        responseBox.style.display = 'block';
        responseBox.innerHTML = `
          <div class="error-message">
            <i class="fas fa-bug"></i> Error: ${error.message}
          </div>
        `;
        console.error("JS Fetch error:", error);
      } finally {
        // Reset button state
        submitBtn.innerHTML = '<i class="fas fa-search"></i> Check Status';
        submitBtn.disabled = false;
      }
    });
    
    function formatDate(timestamp) {
      if (!timestamp) return 'N/A';
      
      // Convert MPesa timestamp (YYYYMMDDHHmmss) to readable format
      const dateStr = timestamp.toString();
      if (dateStr.length !== 14) return timestamp;
      
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(8, 10);
      const minute = dateStr.substring(10, 12);
      const second = dateStr.substring(12, 14);
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
  </script>

</body>
</html>