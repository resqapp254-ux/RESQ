Write-Host "--- ENV CHECK ---"
Get-Content .env.local | ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts[0]) {
        "$($parts[0]) = $($parts[1].Length) characters"
    }
}

Write-Host "--- REQUEST RESULT ---"
$body = @{
    institutionName = "Test Hospital"
    contactEmail = "admin@testhospital.com"
    adminFullName = "Jane Doe"
    adminEmail = "jane@testhospital.com"
    adminTempPassword = "TempPass123!"
} | ConvertTo-Json

try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/create-institution" -Method Post -Body $body -ContentType "application/json"
    Write-Host "SUCCESS:"
    $result | ConvertTo-Json
} catch {
    Write-Host "FAILED:"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd()
}
