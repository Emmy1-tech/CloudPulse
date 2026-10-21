#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'
$backendVenv = Join-Path $backendDir '.venv'
$backendPython = Join-Path $backendVenv 'Scripts\python.exe'
$npmLock = Join-Path $frontendDir 'package-lock.json'
$frontendModules = Join-Path $frontendDir 'node_modules'
$backendHealthUrl = 'http://127.0.0.1:8000/health'
$frontendUrl = 'http://127.0.0.1:3000/'

function Test-PortListening {
    param([int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if (-not $pending.AsyncWaitHandle.WaitOne(350)) {
            return $false
        }
        $client.EndConnect($pending)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Test-BackendHealth {
    param([int]$TimeoutSeconds = 60)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $health = Invoke-RestMethod -Uri $backendHealthUrl -TimeoutSec 2
            if ($health.status -eq 'healthy' -and $health.database -eq 'ok') {
                return $true
            }
        }
        catch {
            # The API may still be starting; retry until the bounded deadline.
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    return $false
}

function Test-FrontendHttp {
    param([int]$TimeoutSeconds = 60)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $frontendUrl -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200 -and $response.Content -match 'CloudPulse') {
                return $true
            }
        }
        catch {
            # Vite may still be starting; retry until the bounded deadline.
        }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)

    return $false
}

function Quote-PowerShellLiteral {
    param([string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

Write-Host ''
Write-Host 'CloudPulse local development startup' -ForegroundColor Cyan
Write-Host 'Repository: ' -NoNewline
Write-Host $repoRoot
Write-Host ''

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw 'Python Launcher (py.exe) was not found. Install Python 3.12 from python.org and enable the Python Launcher.'
}
& py -3.12 --version
if ($LASTEXITCODE -ne 0) {
    throw 'Python 3.12 was not found. Install Python 3.12, then run this script again.'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js and npm were not found. Install Node.js 22 LTS, reopen PowerShell, and run this script again.'
}
$nodeVersionText = (& node --version).Trim().TrimStart('v')
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion.Major -lt 22) {
    throw "Node.js 22 or newer is required for this project. Detected $nodeVersionText."
}
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source

$backendRequirements = Join-Path $backendDir 'requirements.txt'
$backendDevRequirements = Join-Path $backendDir 'requirements-dev.txt'
if (-not (Test-Path $backendPython)) {
    Write-Host 'Creating the backend virtual environment...' -ForegroundColor Cyan
    & py -3.12 -m venv $backendVenv
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not create backend/.venv. Check that Python 3.12 is installed correctly.'
    }
}

& $backendPython -c 'import fastapi, uvicorn, sqlalchemy, pydantic_settings, pytest, httpx2' *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Installing backend and test dependencies (first run or incomplete environment)...' -ForegroundColor Cyan
    & $backendPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw 'Could not upgrade pip in backend/.venv.' }
    & $backendPython -m pip install -r $backendRequirements -r $backendDevRequirements
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed. Review the command output and retry.' }
}

$backendEnv = Join-Path $backendDir '.env'
if (-not (Test-Path $backendEnv)) {
    Copy-Item (Join-Path $backendDir '.env.example') $backendEnv
    Write-Host 'Created backend/.env from the example; an existing .env is never overwritten.'
}

$frontendEnv = Join-Path $frontendDir '.env'
if (-not (Test-Path $frontendEnv)) {
    Copy-Item (Join-Path $frontendDir '.env.example') $frontendEnv
    Write-Host 'Created frontend/.env from the example; an existing .env is never overwritten.'
}

$packageJson = Join-Path $frontendDir 'package.json'
$modulesLock = Join-Path $frontendModules '.package-lock.json'
$needsNpmInstall = -not (Test-Path $modulesLock)
if (-not $needsNpmInstall -and (Test-Path $npmLock)) {
    $needsNpmInstall = (Get-Item $npmLock).LastWriteTimeUtc -gt (Get-Item $modulesLock).LastWriteTimeUtc
}
if (-not (Test-Path $packageJson)) {
    throw 'frontend/package.json is missing. Make sure you are running this script from a complete CloudPulse checkout.'
}
if ($needsNpmInstall) {
    Write-Host 'Installing frontend dependencies with npm ci...' -ForegroundColor Cyan
    Push-Location $frontendDir
    try {
        & $npmCommand ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed. Review npm output and retry.' }
    }
    finally {
        Pop-Location
    }
}

$backendListening = Test-PortListening -Port 8000
if ($backendListening) {
    if (-not (Test-BackendHealth -TimeoutSeconds 3)) {
        throw 'Port 8000 is already occupied, but it did not return the expected CloudPulse /health response. Stop the process using port 8000, then rerun .\dev.ps1.'
    }
    Write-Host 'Reusing the existing healthy backend on port 8000.' -ForegroundColor Green
}
else {
    Write-Host 'Initializing SQLite tables (existing database files are preserved)...' -ForegroundColor Cyan
    Push-Location $backendDir
    try {
        & $backendPython -c 'from app.database import init_db; init_db()'
        if ($LASTEXITCODE -ne 0) { throw 'SQLite initialization failed. Review backend/.env and the backend terminal output.' }
    }
    finally {
        Pop-Location
    }

    $backendCommand = '& ' + (Quote-PowerShellLiteral $backendPython) + ' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'
    $backendArguments = '-NoExit -ExecutionPolicy Bypass -Command "' + $backendCommand + '"'
    Start-Process -FilePath 'powershell.exe' -ArgumentList $backendArguments -WorkingDirectory $backendDir
    Write-Host 'Waiting for the backend and its SQLite health check...' -ForegroundColor Cyan
    if (-not (Test-BackendHealth -TimeoutSeconds 90)) {
        throw 'Backend did not become healthy within 90 seconds. Review the backend PowerShell window for the startup exception.'
    }
}

$frontendListening = Test-PortListening -Port 3000
if ($frontendListening) {
    if (-not (Test-FrontendHttp -TimeoutSeconds 3)) {
        throw 'Port 3000 is already occupied, but it did not serve the CloudPulse frontend. Stop the process using port 3000, then rerun .\dev.ps1.'
    }
    Write-Host 'Reusing the existing CloudPulse frontend on port 3000.' -ForegroundColor Green
}
else {
    $frontendCommand = '& ' + (Quote-PowerShellLiteral $npmCommand) + ' run dev -- --host 127.0.0.1 --port 3000 --strictPort'
    $frontendArguments = '-NoExit -ExecutionPolicy Bypass -Command "' + $frontendCommand + '"'
    Start-Process -FilePath 'powershell.exe' -ArgumentList $frontendArguments -WorkingDirectory $frontendDir
    Write-Host 'Waiting for the frontend HTTP response...' -ForegroundColor Cyan
    if (-not (Test-FrontendHttp -TimeoutSeconds 60)) {
        throw 'Frontend did not return HTTP 200 within 60 seconds. Review the frontend PowerShell window for the startup error.'
    }
}

Write-Host ''
Write-Host 'CloudPulse is responding locally:' -ForegroundColor Green
Write-Host '  Frontend:      http://localhost:3000'
Write-Host '  Backend health: http://localhost:8000/health'
Write-Host '  API docs:      http://localhost:8000/docs'
Write-Host ''
Write-Host 'These URLs were checked by this script. Close each server PowerShell window or press Ctrl+C inside it to stop that server.'
