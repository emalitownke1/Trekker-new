<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

include 'secure_config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $checkout_request_id = $_POST['checkout_request_id'] ?? '';

    // Prepare payload
    $payload = json_encode([
        "checkout_request_id" => $checkout_request_id
    ]);

    // cURL to SmartPay API
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: $apiKey",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err) {
        echo json_encode([
            "success" => false,
            "error" => "cURL Error",
            "message" => $err,
            "http_code" => $httpCode
        ]);
        exit;
    }

    $decoded = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            "success" => false,
            "error" => "Invalid JSON",
            "message" => "API returned invalid JSON response",
            "raw_response" => $response,
            "http_code" => $httpCode
        ]);
        exit;
    }

    // Check for different response formats
    if (isset($decoded['Body']['stkCallback'])) {
        // MPesa callback format
        $resultCode = $decoded['Body']['stkCallback']['ResultCode'] ?? null;
        
        if ($resultCode == 0) {
            // Success
            echo json_encode([
                "success" => true,
                "Body" => $decoded['Body'],
                "message" => $decoded['Body']['stkCallback']['ResultDesc'] ?? "Payment successful"
            ]);
        } else {
            // Error
            echo json_encode([
                "success" => false,
                "Body" => $decoded['Body'],
                "error" => "Payment Failed",
                "message" => $decoded['Body']['stkCallback']['ResultDesc'] ?? "Payment processing failed",
                "response_code" => $resultCode
            ]);
        }
    } elseif (isset($decoded['response_code'])) {
        // Alternative error format
        echo json_encode([
            "success" => false,
            "error" => "Payment Status",
            "message" => $decoded['message'] ?? "Payment status unknown",
            "response_code" => $decoded['response_code'],
            "raw_response" => $decoded
        ]);
    } else {
        // Unknown format
        echo json_encode([
            "success" => false,
            "error" => "Unknown Response",
            "message" => "Unexpected response format from API",
            "raw_response" => $decoded,
            "http_code" => $httpCode
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "error" => "Method Not Allowed",
        "message" => "Only POST requests are accepted"
    ]);
}