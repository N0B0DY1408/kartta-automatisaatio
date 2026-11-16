$workerUrl = "https://kartta-julkaisupalvelu.tuikkamatias.workers.dev"

$secret = Read-Host "Syötä julkaisukoodi" -AsSecureString
$credential = [System.Net.NetworkCredential]::new("", $secret)

$headers = @{
    Authorization = "Bearer $($credential.Password)"
}

$planPath = ".\public-view\data\active-plan.json"

$plan = Get-Content $planPath -Raw

Invoke-RestMethod `
    -Uri "$workerUrl/publish" `
    -Method Post `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $plan