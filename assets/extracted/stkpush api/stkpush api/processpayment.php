<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

include 'secure_config.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $phone = $_POST['phone'] ?? '';
    $amount = $_POST['amount'] ?? '';
    $account_reference = $_POST['account_reference'] ?? 'UNSPECIFIED';
    $description = $_POST['description'] ?? '';

    $payload = json_encode([
        "phone" => $phone,
        "amount" => $amount,
        "account_reference" => $account_reference,
        "description" => $description
    ]);

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
    curl_close($ch);

    if ($err) {
        echo json_encode([
            "success" => false,
            "message" => "cURL Error: $err",
            "error_code" => "CURL_ERROR",
            "raw_response" => null
        ]);
    } else {
        $decoded = json_decode($response, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            if (!empty($decoded['success'])) {
                echo json_encode([
                    "success" => true,
                    "message" => $decoded['message'] ?? 'Payment initiated successfully',
                    "data" => $decoded
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => $decoded['error'] ?? $decoded['message'] ?? 'Payment failed.',
                    "details" => $decoded['details'] ?? null,
                    "error_code" => $decoded['error_code'] ?? 'UNKNOWN',
                    "raw_response" => $decoded
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "message" => "API returned invalid JSON",
                "error_code" => "INVALID_JSON",
                "raw_response" => $response
            ]);
        }
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method. Use POST.",
        "error_code" => "METHOD_NOT_ALLOWED"
    ]);
}
