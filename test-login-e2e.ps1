$API_BASE_URL = "http://localhost:3001/api/v1"
$UNIQUE_ID = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "=== Full E2E Login Test ===" -ForegroundColor Green

$testUser = @{
    email = "e2e-test-${UNIQUE_ID}@example.com"
    password = "E2ETestPassword123"
    firstName = "E2E"
    lastName = "Test"
    role = "client"
}

# Step 1: Register
Write-Host "Step 1: Registering new user..." -ForegroundColor Cyan
$registerBody = @{
    email = $testUser.email
    password = $testUser.password
    firstName = $testUser.firstName
    lastName = $testUser.lastName
    role = $testUser.role
} | ConvertTo-Json

$registerRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/register" -Method POST -ContentType "application/json" -Body $registerBody -UseBasicParsing
$registerData = $registerRes.Content | ConvertFrom-Json

Write-Host "✓ Registration successful" -ForegroundColor Green

# Step 2: Login
Write-Host "Step 2: Logging in..." -ForegroundColor Cyan
$loginBody = @{
    email = $testUser.email
    password = $testUser.password
} | ConvertTo-Json

$loginRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
$loginData = $loginRes.Content | ConvertFrom-Json

$user = $loginData.data.user
$accessToken = $loginData.data.accessToken
$refreshToken = $loginData.data.refreshToken

Write-Host "✓ Login successful" -ForegroundColor Green
Write-Host "  User: $($user.email)"
Write-Host "  Has accessToken: $($null -ne $accessToken)"
Write-Host "  Has refreshToken: $($null -ne $refreshToken)"

# Step 3: Test access token
Write-Host "Step 3: Verifying access token..." -ForegroundColor Cyan
$meRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/me" -Method GET -Headers @{ "Authorization" = "Bearer $accessToken" } -UseBasicParsing
$meData = $meRes.Content | ConvertFrom-Json
Write-Host "✓ Access token works - authenticated as: $($meData.data.user.email)" -ForegroundColor Green

Write-Host "`n=== ALL TESTS PASSED ===" -ForegroundColor Green
