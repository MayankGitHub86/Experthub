#!/usr/bin/env pwsh

# Full end-to-end login test using PowerShell

$API_BASE_URL = "http://localhost:3001/api/v1"
$UNIQUE_ID = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "=== Full E2E Login Test ===" -ForegroundColor Green
Write-Host ""

$testUser = @{
    email = "e2e-test-${UNIQUE_ID}@example.com"
    password = "E2ETestPassword123"
    firstName = "E2E"
    lastName = "Test"
    role = "client"
}

try {
    # Step 1: Register
    Write-Host "Step 1: Registering new user..." -ForegroundColor Cyan
    $registerBody = @{
        email = $testUser.email
        password = $testUser.password
        firstName = $testUser.firstName
        lastName = $testUser.lastName
        role = $testUser.role
    } | ConvertTo-Json
    
    $registerRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/register" -Method POST -ContentType "application/json" -Body $registerBody -UseBasicParsing 2>&1
    $registerData = $registerRes.Content | ConvertFrom-Json
    
    if ($registerData.status -ne "success") {
        Write-Host "✗ Registration failed: $($registerData.message)" -ForegroundColor Red
        return
    }
    Write-Host "✓ Registration successful" -ForegroundColor Green
    Write-Host ""

    # Step 2: Login
    Write-Host "Step 2: Logging in with registered user..." -ForegroundColor Cyan
    $loginBody = @{
        email = $testUser.email
        password = $testUser.password
    } | ConvertTo-Json
    
    $loginRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing 2>&1
    $loginData = $loginRes.Content | ConvertFrom-Json
    
    if ($loginData.status -ne "success") {
        Write-Host "✗ Login failed: $($loginData.message)" -ForegroundColor Red
        return
    }

    $user = $loginData.data.user
    $accessToken = $loginData.data.accessToken
    $refreshToken = $loginData.data.refreshToken

    # Verify response structure
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  - User: $($user.email)"
    Write-Host "  - Access Token: $($accessToken.Substring(0, 20))..."
    Write-Host "  - Refresh Token: $(if ($refreshToken) { $refreshToken.Substring(0, 20) + '...' } else { 'MISSING' })"
    
    if (-not $refreshToken) {
        Write-Host ""
        Write-Host "✗ ERROR: refreshToken is missing from login response!" -ForegroundColor Red
        return
    }

    # Step 3: Use access token to get user profile
    Write-Host ""
    Write-Host "Step 3: Verifying access token works..." -ForegroundColor Cyan
    $meRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/me" -Method GET -Headers @{ "Authorization" = "Bearer $accessToken"; "Content-Type" = "application/json" } -UseBasicParsing 2>&1
    $meData = $meRes.Content | ConvertFrom-Json
    
    if ($meData.status -ne "success") {
        Write-Host "✗ GET /auth/me failed: $($meData.message)" -ForegroundColor Red
        return
    }
    
    $profileUser = $meData.data.user
    Write-Host "✓ Access token is valid" -ForegroundColor Green
    Write-Host "  - Authenticated user: $($profileUser.email)"
    Write-Host "  - Role: $($profileUser.role)"

    # Step 4: Verify refresh token endpoint exists
    Write-Host ""
    Write-Host "Step 4: Verifying refresh token endpoint..." -ForegroundColor Cyan
    $refreshBody = @{
        refreshToken = $refreshToken
    } | ConvertTo-Json
    
    $refreshRes = Invoke-WebRequest -Uri "$API_BASE_URL/auth/refresh-token" -Method POST -ContentType "application/json" -Body $refreshBody -UseBasicParsing 2>&1
    $refreshData = $refreshRes.Content | ConvertFrom-Json
    
    if ($refreshData.status -ne "success") {
        Write-Host "✗ Token refresh failed: $($refreshData.message)" -ForegroundColor Red
        return
    }
    
    $newAccessToken = $refreshData.data.accessToken
    Write-Host "✓ Token refresh works" -ForegroundColor Green
    Write-Host "  - New Access Token: $($newAccessToken.Substring(0, 20))..."

    Write-Host ""
    Write-Host "=== All Tests PASSED ✓ ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    Write-Host "1. ✓ User registration works"
    Write-Host "2. ✓ Login returns user, accessToken, and refreshToken"
    Write-Host "3. ✓ Access token allows authenticated requests"
    Write-Host "4. ✓ Refresh token can generate new access tokens"

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
