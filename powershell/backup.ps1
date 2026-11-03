param (
    [string]$AppRoot = (Split-Path $PSScriptRoot -Parent)
)

$PlansFolder = Join-Path $AppRoot "Suunnitelmat"
$BackupFolder = Join-Path $AppRoot "varakansio"
$LogFile = Join-Path $AppRoot "varalta.txt"

function Write-Log {
    param (
        [string]$Message
    )

    $Time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Time - $Message" | Add-Content -Path $LogFile

    Write-Host $Message
}

function Backup-Plans {

    if (-not (Test-Path $PlansFolder)) {
        Write-Log "Suunnitelmat kansio ei ole olemassa."
        return
    }

    if (-not (Test-Path $BackupFolder)) {
        New-Item -ItemType Directory -Path $BackupFolder | Out-Null
    }

    $Plans = Get-ChildItem -Path $PlansFolder -Filter "*.json"

    if ($Plans.Count -eq 0) {
        Write-Log "Ei löydy varmuuskopioitavia suunnitelmia."
        return
    }

    foreach ($Plan in $Plans) {

        $Destination = Join-Path $BackupFolder $Plan.Name

        Copy-Item -Path $Plan.FullName -Destination $Destination -Force

        Write-Log "varmuuskopioitu: $($Plan.Name)"
    }
}

Backup-Plans