Write-Host "--- READING SERVICE ROLE KEY LENGTH (not shown) ---"
$envContent = Get-Content .env.local
$serviceKeyLine = $envContent | Where-Object { $_ -match '^SUPABASE_SERVICE_ROLE_KEY=' }
$serviceKey = ($serviceKeyLine -split '=', 2)[1]
Write-Host "Key starts with: $($serviceKey.Substring(0, [Math]::Min(12, $serviceKey.Length)))..."
Write-Host "Key length: $($serviceKey.Length)"

Write-Host "--- CALLING SUPABASE ADMIN API DIRECTLY ---"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "User-Agent" = "RESQ-Server/1.0"
}

$body = @{
    email = "directtest@testhospital.com"
    password = "TempPass123!"
    email_confirm = $true
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "https://clcetqfgmqpzukjjfbjc.supabase.co/auth/v1/admin/users" -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS:"
    $result | ConvertTo-Json
} catch {
    Write-Host "FAILED - Status Code:"
    $_.Exception.Response.StatusCode.value__
    Write-Host "FAILED - Body:"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd()
}