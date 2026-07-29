<#
.SYNOPSIS
    AgenMonster Installer for Windows — production-grade.
.DESCRIPTION
    Copies the portable bundle to Program Files, registers Start Menu and
    Desktop shortcuts, registers the Windows protocol handler (agenmonster://),
    writes Add/Remove Programs entries, and (optionally) verifies the SHA256
    checksums of the copied binaries against a bundled QA_HASHES.txt.

    After copying, runs SignTool or osslsigncode if a code-signing cert
    is available (see PRODUCTION.md for setup).

.PARAMETER InstallDir
    Root install directory. Default: $env:ProgramFiles\AgenMonster
.PARAMETER SourceDir
    Directory that contains the portable bundle. Default: script's own folder.
.PARAMETER NoDesktopShortcut
    Skip desktop shortcut creation.
.PARAMETER NoStartMenu
    Skip Start Menu entries.
.PARAMETER NoSign
    Do not attempt to sign binaries.
.PARAMETER NoVerify
    Skip SHA256 verification step.
.PARAMETER Silent
    No prompts; fail fast on any error.
.PARAMETER Uninstall
    Remove AgenMonster from this system before installing.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install-AgenMonster.ps1
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Install-AgenMonster.ps1 -InstallDir "D:\Apps\AgenMonster" -Silent
#>
param(
    [string]$InstallDir    = "$env:ProgramFiles\AgenMonster",
    [string]$SourceDir     = "",
    [switch]$NoDesktopShortcut,
    [switch]$NoStartMenu,
    [switch]$NoSign,
    [switch]$NoVerify,
    [switch]$Silent,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$AppName           = 'AgenMonster'
$AppId             = 'dev.agenmonster.desktop'
$AppDisplayName    = 'AgenMonster'
$AppPublisher      = 'AgenMonster Team'
$AppUrl            = 'https://github.com/atharia-agi/AgenMonster'
$AppExe            = 'agenmonster-desktop.exe'
$UninstallExe      = 'Uninstall-AgenMonster.exe'
$HashFile          = 'QA_HASHES.txt'
$StartMenuDir      = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\$AppName"
$DesktopDir        = [Environment]::GetFolderPath('Desktop')

if (-not $SourceDir) {
    $SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

function Write-Step($msg) {
    if (-not $Silent) { Write-Host "[*] $msg" -ForegroundColor Cyan }
}

function Write-Ok($msg) {
    if (-not $Silent) { Write-Host "[OK] $msg" -ForegroundColor Green }
}

function Write-Warn($msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Write-Err($msg) {
    Write-Host "[ERR] $msg" -ForegroundColor Red
}

function Test-Admin {
    $identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-Sha256($path) {
    return (Get-FileHash -LiteralPath $path -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash.ToUpperInvariant()
}

function Invoke-CodeSign($filePath) {
    if (-not $NoSign) {
        if ($env:CODE_SIGN_PFX -and $env:CODE_SIGN_PFX_PASSWORD) {
            Write-Step "Signing $filePath with osslsigncode"
            $pfx    = $env:CODE_SIGN_PFX
            $out    = [System.IO.Path]::ChangeExtension($filePath, '.signed.exe')
            $result = & osslsigncode sign `
                -pkcs12 $pfx `
                -pass $env:CODE_SIGN_PFX_PASSWORD `
                -n $AppDisplayName `
                -url $AppUrl `
                -t 'http://timestamp.digicert.com' `
                -in $filePath `
                -out $out 2>&1
            if ($LASTEXITCODE -eq 0) {
                Move-Item -LiteralPath $out -Destination $filePath -Force
                Write-Ok "Signed: $filePath"
            } else {
                Write-Warn "Signing failed for $filePath : $result"
            }
        } elseif (Get-Command signtool.exe -ErrorAction SilentlyContinue) {
            Write-Step "Signing $filePath with signtool"
            $ts   = 'http://timestamp.digicert.com'
            $pfx  = $env:CODE_SIGN_PFX
            $pass = $env:CODE_SIGN_PFX_PASSWORD
            if ($pfx) {
                $argList = @('sign', '/f', $pfx, '/p', $pass, '/t', $ts, '/fd', 'SHA256', '/tr', $ts, '/td', 'SHA256', '/v', $filePath)
                $r = & signtool.exe @argList 2>&1
                if ($LASTEXITCODE -eq 0) { Write-Ok "Signed: $filePath" }
                else { Write-Warn "signtool failed for $filePath : $r" }
            }
        } else {
            Write-Step "No code-signing tool available — skipping signing step (see PRODUCTION.md)"
        }
    }
}

function Restore-Binaries($targetDir) {
    $required = @($AppExe, 'agenmonster_desktop_lib.dll', 'WebView2Loader.dll')
    foreach ($bin in $required) {
        $src = Join-Path $SourceDir $bin
        $dst = Join-Path $targetDir  $bin
        if (-not (Test-Path -LiteralPath $src)) { continue }
        Copy-Item -LiteralPath $src -Destination $dst -Force
        Invoke-CodeSign $dst
    }
}

# ─── UNINSTALL ───────────────────────────────────────────────────────────────
if ($Uninstall) {
    Write-Step "Uninstalling $AppDisplayName ..."

    if (-not (Test-Path -LiteralPath $InstallDir)) {
        Write-Err "Installation not found at: $InstallDir"
        exit 1
    }

    Get-Process -Name ($AppExe -replace '\.exe$','') -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2

    if (-not $Silent) {
        $confirm = Read-Host "Remove $AppDisplayName from $InstallDir? (y/N)"
        if ($confirm -ne 'y') { Write-Host "Cancelled."; exit 0 }
    }

    if (Test-Path -LiteralPath $DesktopDir) {
        $shortcut = Join-Path $DesktopDir "$AppDisplayName.lnk"
        if (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut -Force }
    }
    if (Test-Path -LiteralPath $StartMenuDir) { Remove-Item -LiteralPath $StartMenuDir -Recurse -Force }

    $regPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$AppId",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$AppId",
        "HKCU:\Software\Classes\$AppId"
    )
    foreach ($rp in $regPaths) {
        if (Test-Path $rp) { Remove-Item -LiteralPath $rp -Recurse -Force -ErrorAction SilentlyContinue }
    }

    if (Test-Path -LiteralPath $InstallDir) {
        Remove-Item -LiteralPath $InstallDir -Recurse -Force
        Write-Ok "Removed installation directory"
    }

    Write-Ok "Uninstall complete."
    exit 0
}

# ─── INSTALL ─────────────────────────────────────────────────────────────────
if (-not (Test-Admin)) {
    Write-Err "Administrator privileges required. Re-run PowerShell as Administrator."
    exit 1
}

$mainExeInSource = Join-Path $SourceDir $AppExe
if (-not (Test-Path -LiteralPath $mainExeInSource)) {
    Write-Err "$AppExe not found in: $SourceDir"
    Write-Host "  Place this script in the portable-bundle directory and re-run." -ForegroundColor Yellow
    exit 1
}

Write-Step "Installing $AppDisplayName v$((Get-Item $mainExeInSource).VersionInfo.FileVersion) ..."
Write-Step "Target:   $InstallDir"
Write-Step "Source:   $SourceDir"

# ── SHA256 verification ──────────────────────────────────────────────────────
if (-not $NoVerify -and (Test-Path -LiteralPath (Join-Path $SourceDir $HashFile))) {
    Write-Step "Verifying SHA256 checksums ..."
    $hashMap = @{}
    Get-Content -LiteralPath (Join-Path $SourceDir $HashFile) | ForEach-Object {
        $parts = $_.Trim() -split '\s+', 2
        if ($parts.Count -eq 2) { $hashMap[$parts[1]] = $parts[0] }
    }
    $errors = @()
    foreach ($name in $hashMap.Keys) {
        $srcFile = Join-Path $SourceDir $name
        if (-not (Test-Path -LiteralPath $srcFile)) {
            $errors += "MISSING: $name (expected $(hashMap[$name]))"
            continue
        }
        $actual = Get-Sha256 $srcFile
        if ($actual -ne $hashMap[$name]) {
            $errors += "HASH_MISMATCH: $name (got $actual, expected $(hashMap[$name]))"
        }
    }
    if ($errors.Count -gt 0) {
        Write-Err "Checksum verification failed:"
        $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        if (-not $Silent) {
            $proceed = Read-Host "Continue anyway? (y/N)"
            if ($proceed -ne 'y') { exit 1 }
        } else { exit 1 }
    } else {
        Write-Ok "All checksums verified"
    }
}

# ── Copy binaries ─────────────────────────────────────────────────────────────
if (Test-Path -LiteralPath $InstallDir) {
    if (-not $Silent) {
        $confirm = Read-Host "Installation already exists at:`n  $InstallDir`nOverwrite? (y/N)"
        if ($confirm -ne 'y') { Write-Host "Cancelled."; exit 0 }
    }
    Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
Write-Step "Copying binaries ..."
Restore-Binaries $InstallDir

$mainExe = Join-Path $InstallDir $AppExe
if (-not (Test-Path -LiteralPath $mainExe)) {
    Write-Err "Main executable missing after copy: $mainExe"
    exit 1
}

# copy web assets if present
$srcWeb = Join-Path $SourceDir 'web'
if (-not (Test-Path -LiteralPath $srcWeb)) { $srcWeb = Join-Path $SourceDir '_app' }
if (-not (Test-Path -LiteralPath $srcWeb)) { $srcWeb = Join-Path $SourceDir 'AgenMonster' }
if (Test-Path -LiteralPath $srcWeb) {
    Write-Step "Copying web assets ..."
    Copy-Item -LiteralPath $srcWeb -Destination (Join-Path $InstallDir 'web') -Recurse -Force
}
if (Test-Path -LiteralPath (Join-Path $SourceDir 'QA_HASHES.txt')) {
    Copy-Item -LiteralPath (Join-Path $SourceDir 'QA_HASHES.txt') -Destination (Join-Path $InstallDir 'QA_HASHES.txt') -Force
}
if (Test-Path -LiteralPath (Join-Path $SourceDir 'LICENSE')) {
    Copy-Item -LiteralPath (Join-Path $SourceDir 'LICENSE') -Destination (Join-Path $InstallDir 'LICENSE') -Force
}

$exeVersion      = (Get-Item $mainExe).VersionInfo.FileVersion
$displayVersion  = if ($exeVersion) { $exeVersion } else { '1.0.0' }
$installedSizeKB = [math]::Round((Get-ChildItem $InstallDir -File -Recurse | Measure-Object Length -Sum).Sum / 1KB)

# ── Start Menu ───────────────────────────────────────────────────────────────
if (-not $NoStartMenu) {
    Write-Step "Creating Start Menu entries ..."
    if (Test-Path -LiteralPath $StartMenuDir) { Remove-Item -LiteralPath $StartMenuDir -Recurse -Force }
    New-Item -Path $StartMenuDir -ItemType Directory -Force | Out-Null

    $shell            = New-Object -ComObject WScript.Shell
    $lnk              = Join-Path $StartMenuDir "$AppDisplayName.lnk"
    $shortcut         = $shell.CreateShortcut($lnk)
    $shortcut.TargetPath      = $mainExe
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description     = "$AppDisplayName — AI agent desktop companion"
    $shortcut.Save()

    $uninstallLnk     = Join-Path $StartMenuDir "Uninstall $AppDisplayName.lnk"
    $shortcut2        = $shell.CreateShortcut($uninstallLnk)
    $shortcut2.TargetPath      = 'powershell.exe'
    $shortcut2.Arguments       = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Uninstall -InstallDir `"$InstallDir`""
    $shortcut2.WorkingDirectory = $InstallDir
    $shortcut2.Description     = "Uninstall $AppDisplayName"
    $shortcut2.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null
    Write-Ok "Start Menu entries created"
}

# ── Desktop shortcut ─────────────────────────────────────────────────────────
if (-not $NoDesktopShortcut) {
    Write-Step "Creating desktop shortcut ..."
    $shell     = New-Object -ComObject WScript.Shell
    $lnk       = Join-Path $DesktopDir "$AppDisplayName.lnk"
    $shortcut  = $shell.CreateShortcut($lnk)
    $shortcut.TargetPath       = $mainExe
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description      = "$AppDisplayName — AI agent desktop companion"
    $shortcut.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null
    Write-Ok "Desktop shortcut created"
}

# ── Add/Remove Programs ──────────────────────────────────────────────────────
Write-Step "Registering Add/Remove Programs entry ..."
$uninstallCmd = "powershell.exe -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Uninstall -InstallDir `"$InstallDir`""
$regRegions = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
)
foreach ($root in $regRegions) {
    $rp = Join-Path $root $AppId
    if (-not (Test-Path $rp)) { New-Item $rp -ItemType Directory -Force | Out-Null }
    Set-ItemProperty -Path $rp -Name 'DisplayName'      -Value $AppDisplayName
    Set-ItemProperty -Path $rp -Name 'DisplayVersion'   -Value $displayVersion
    Set-ItemProperty -Path $rp -Name 'Publisher'        -Value $AppPublisher
    Set-ItemProperty -Path $rp -Name 'InstallLocation'  -Value $InstallDir
    Set-ItemProperty -Path $rp -Name 'UninstallString'  -Value $uninstallCmd
    Set-ItemProperty -Path $rp -Name 'QuietUninstallString' -Value $uninstallCmd
    Set-ItemProperty -Path $rp -Name 'DisplayIcon'      -Value $mainExe
    Set-ItemProperty -Path $rp -Name 'EstimatedSize'    -Value $installedSizeKB
    Set-ItemProperty -Path $rp -Name 'InstallDate'      -Value (Get-Date -Format 'yyyyMMdd')
    Set-ItemProperty -Path $rp -Name 'NoModify'         -Value 1
    Set-ItemProperty -Path $rp -Name 'NoRepair'         -Value 1
    Set-ItemProperty -Path $rp -Name 'HelpLink'         -Value $AppUrl
    Set-ItemProperty -Path $rp -Name 'URLInfoAbout'     -Value $AppUrl
    Set-ItemProperty -Path $rp -Name 'URLUpdateInfo'    -Value "$AppUrl/releases/latest"
}
Write-Ok "Registered in Add/Remove Programs"

# ── Protocol handler ─────────────────────────────────────────────────────────
Write-Step "Configuring protocol handler ($AppId://) ..."
$protocolPath = "HKCU:\Software\Classes\$AppId"
if (-not (Test-Path $protocolPath)) {
    New-Item $protocolPath -ItemType Directory -Force | Out-Null
    Set-ItemProperty $protocolPath '(default)' "$AppDisplayName Protocol Handler"
    Set-ItemProperty $protocolPath 'URL Protocol' ''
    New-Item "$protocolPath\shell\open\command" -ItemType Directory -Force | Out-Null
    Set-ItemProperty "$protocolPath\shell\open\command" '(default)' "`"$mainExe`" `"%1`""
    Write-Ok "Protocol handler registered: $AppId://<link>"
} else {
    Write-Step "Protocol handler already registered, skipping"
}

# ── Final summary ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  $AppDisplayName installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Location:    $InstallDir"
Write-Host "  Version:     $displayVersion"
Write-Host "  Size:        $installedSizeKB KB"
Write-Host "  Protocol:    $AppId://"
Write-Host "  Start Menu:  $StartMenuDir"
Write-Host "  URL:         $AppUrl"
Write-Host ""

if (-not $Silent) {
    $launch = Read-Host "Launch $AppDisplayName now? (Y/n)"
    if ($launch -ne 'n') { Start-Process -LiteralPath $mainExe -WorkingDirectory $InstallDir }
}
