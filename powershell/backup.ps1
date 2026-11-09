param (
    [Parameter(Mandatory = $true)]
    [string]$DataRoot
)

$PlansFolder = Join-Path $DataRoot "Suunnitelmat"
$BackupFolder = Join-Path $DataRoot "varmuuskopiot"
$LogFile = Join-Path $DataRoot "varmuuskopiointi.log"

$BackupTime = Get-Date -Format "yyyy-MM-dd_HHmmss"
$CurrentBackupFolder = Join-Path $BackupFolder $BackupTime
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

    New-Item -ItemType Directory -Path $CurrentBackupFolder -Force | Out-Null

    $Plans = Get-ChildItem -Path $PlansFolder -Filter "*.json"

    if ($Plans.Count -eq 0) {
        Write-Log "Ei löydy varmuuskopioitavia suunnitelmia."
        return
    }

    foreach ($Plan in $Plans) {

        $Destination = Join-Path $CurrentBackupFolder $Plan.Name

        Copy-Item -Path $Plan.FullName -Destination $Destination -Force

        Write-Log "varmuuskopioitu: $($Plan.Name)"
    }
}

Backup-Plans