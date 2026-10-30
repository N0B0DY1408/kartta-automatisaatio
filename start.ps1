$AppRoot = if ($PSScriptRoot) {
    $PSScriptRoot
}
else {
    [AppDomain]::CurrentDomain.BaseDirectory
}

$HTMLPath = Join-Path $AppRoot "Interface\index.html"

if (-not (Test-Path $HTMLPath)) {
    [System.Windows.Forms.MessageBox]::Show(
        "Could not find index.html!",
        "Street Market Planner"
    )
    exit
}

Start-Process $HTMLPath