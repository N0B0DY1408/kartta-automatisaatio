
$ErrorActionPreference = "Stop"

# Siirrytään projektin kansioon
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Tarkistetaan kaynnistysymparisto..." -ForegroundColor Cyan

# Tarkistetaan fnm
$Fnm = Get-Command fnm -ErrorAction SilentlyContinue

if ($Fnm) {

    Write-Host "fnm loytyi." -ForegroundColor Green

    fnm env --use-on-cd --shell powershell |
        Out-String |
        Invoke-Expression

} else {

    Write-Host "fnm ei loytynyt." -ForegroundColor Yellow
    Write-Host "Asenna fnm kerran komennolla:"
    Write-Host "winget install Schniz.fnm"

    exit 1
}

# Tarkistetaan Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js ei loytynyt." -ForegroundColor Red
    exit 1
}

# Tarkistetaan npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm ei loytynyt." -ForegroundColor Red
    exit 1
}

Write-Host "Node.js ja npm loytyivat." -ForegroundColor Green

# Tarkistetaan Electronin asennus
$ElectronPath = Join-Path $PSScriptRoot "node_modules/electron/dist/electron.exe"

if (-not (Test-Path $ElectronPath)) {

    Write-Host "Electron puuttuu. Asennetaan riippuvuudet..." -ForegroundColor Yellow

    npm install

    if ($LASTEXITCODE -ne 0) {
        throw "Riippuvuuksien asentaminen epaonnistui."
    }
}

Write-Host "Kaynnistetaan Kartta-automaatio..." -ForegroundColor Cyan

npm start

if ($LASTEXITCODE -ne 0) {
    Write-Host "Ohjelman kaynnistaminen epaonnistui." -ForegroundColor Red
}
