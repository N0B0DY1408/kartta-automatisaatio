
param(
    [Parameter(Mandatory = $true)]
    [string]$PlanName,

    [Parameter(Mandatory = $true)]
    [string]$DataRoot,

    [Parameter(Mandatory = $true)]
    [string]$PublicViewFolder
)

$ErrorActionPreference = 'Stop'

# Define folders and file paths
$PlansFolder = Join-Path $DataRoot 'Suunnitelmat'
$PublicDataFolder = Join-Path $PublicViewFolder 'data'
$SourceFile = Join-Path $PlansFolder ($PlanName + '.json')
$TargetFile = Join-Path $PublicDataFolder 'active-plan.json'
$TempFile = Join-Path $PublicDataFolder 'active-plan.tmp'
$LogFile = Join-Path $DataRoot 'julkaisuloki.log'

# Write an event to the log file
function Write-PublishLog {
    param(
        [string]$Status,
        [string]$Message
    )

    $Time = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $CleanMessage = $Message -replace '[\r\n\t]', ' '

    $LogEntry = '{0} | {1} | Plan: {2} | {3}' -f $Time, $Status, $PlanName, $CleanMessage

    try {
        Add-Content -LiteralPath $LogFile -Value $LogEntry -Encoding UTF8
    }
    catch {
        Write-Warning 'Could not write to the publish log.'
    }
}

try {
    # Check that the plans folder exists
    if (-not (Test-Path -LiteralPath $PlansFolder -PathType Container)) {
        throw 'Plans folder was not found.'
    }

    # Check that the selected plan exists
    if (-not (Test-Path -LiteralPath $SourceFile -PathType Leaf)) {
        throw 'Selected plan was not found.'
    }

    # Read and validate the JSON file
    $JsonContent = Get-Content -LiteralPath $SourceFile -Raw -Encoding UTF8
    $Plan = $JsonContent | ConvertFrom-Json

    if ($null -eq $Plan.kojut) {
        throw 'Plan is missing stall data.'
    }

    # Create the public data folder if needed
    if (-not (Test-Path -LiteralPath $PublicDataFolder -PathType Container)) {
        New-Item -ItemType Directory -Path $PublicDataFolder -Force | Out-Null
    }

    # Copy the plan to a temporary file first
    Copy-Item -LiteralPath $SourceFile -Destination $TempFile -Force

    # Replace the currently published plan
    Move-Item -LiteralPath $TempFile -Destination $TargetFile -Force

    # Log successful publication
    Write-PublishLog -Status 'SUCCESS' -Message ('Published to: ' + $TargetFile)

    Write-Output 'Publication successful.'
    exit 0
}
catch {
    $ErrorMessage = $_.Exception.Message

    # Log failed publication
    Write-PublishLog -Status 'FAILED' -Message $ErrorMessage

    # Remove a possible temporary file
    try {
        if (Test-Path -LiteralPath $TempFile) {
            Remove-Item -LiteralPath $TempFile -Force
        }
    }
    catch {
        Write-Warning 'Could not remove the temporary file.'
    }

    Write-Error -Message ('Publication failed: ' + $ErrorMessage)
    exit 1
}
