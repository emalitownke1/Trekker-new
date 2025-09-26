<?php
// INCLUDE THE ACCESS TOKEN FILE
include '../../credentials_secret/accessToken.php';
include '../../credentials_secret/secretkeys.php';

header('Content-Type: application/json');

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
if (!isset($data['phone']) || !isset($data['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Phone and amount are required']);
    exit();
}

date_default_timezone_set('Africa/Nairobi');
$Timestamp = date('YmdHis');
$Password = base64_encode($shortcode . $passkey . $Timestamp);

$PartyA = $data['phone'];
$Amount = $data['amount'];
$AccountReference = isset($data['account_reference']) ? $data['account_reference'] : 'SMARTPAY';
$TransactionDesc = 'smartpay_deposit';

$stkpushheader = ['Content-Type:application/json', 'Authorization:Bearer ' . $access_token];

// INITIATE CURL
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $processrequestUrl);
curl_setopt($curl, CURLOPT_HTTPHEADER, $stkpushheader);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_POST, true);

$curl_post_data = [
    'BusinessShortCode' => $shortcode,
    'Password' => $Password,
    'Timestamp' => $Timestamp,
    'TransactionType' => 'CustomerPayBillOnline',
    'Amount' => $Amount,
    'PartyA' => $PartyA,
    'PartyB' => $shortcode,
    'PhoneNumber' => $PartyA,
    'CallBackURL' => $callback_url,
    'AccountReference' => $AccountReference,
    'TransactionDesc' => $TransactionDesc
];

curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($curl_post_data));

$curl_response = curl_exec($curl);
$response_data = json_decode($curl_response, true);

if (isset($response_data['ResponseCode'])) {
    if ($response_data['ResponseCode'] == "0") {
        echo json_encode([
            'success' => true,
            'checkoutRequestID' => $response_data['CheckoutRequestID'],
            'message' => 'STK Push initiated successfully',
            'full_response' => $response_data // Include full response for debugging
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $response_data['errorMessage'] ?? 'Failed to initiate payment',
            'response_code' => $response_data['ResponseCode'],
            'error_code' => $response_data['errorCode'] ?? null,
            'request_id' => $response_data['requestId'] ?? null,
            'full_response' => $response_data
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Invalid response from M-Pesa',
        'raw_response' => $curl_response, // Show exactly what M-Pesa returned
        'curl_error' => curl_error($curl) ?? null,
        'http_code' => curl_getinfo($curl, CURLINFO_HTTP_CODE)
    ]);
}

curl_close($curl);
?>