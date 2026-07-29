<#
.SYNOPSIS
    AgenMonster Installer for Windows
.DESCRIPTION
    Professional installer with Start Menu, Desktop shortcuts,
    Add/Remove Programs registration, and optional auto-launch.
.PARAMETER InstallDir
    Installation directory. Default: $ProgramFiles\AgenMonster
.PARAMETER NoDesktopShortcut
    Skip desktop shortcut creation
.PARAMETER NoStartMenu
    Skip Start Menu entries
.PARAMETER Silent
    Silent install (no prompts)
.EXAMPLE
    .\Install-AgenMonster.ps1
    .\Install-AgenMonster.ps1 -InstallDir "D:\Apps\AgenMonster"
    .\Install-AgenMonster.ps1 -Silent
#>
param(
    [string]$InstallDir = "$env:ProgramFiles\AgenMonster",
    [switch]$NoDesktopShortcut,
    [switch]$NoStartMenu,
    [switch]$Silent,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$AppName = 'AgenMonster'
$AppId = 'dev.agenmonster.desktop'
$AppDisplayName = 'AgenMonster'
$AppPublisher = 'AgenMonster'
$AppExe = 'agenmonster-desktop.exe'
$UninstallExe = 'Uninstall-AgenMonster.exe'
$StartMenuDir = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\$AppName"
$DesktopDir = [Environment]::GetFolderPath('Desktop')
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($msg) {
    if (-not $Silent) { Write-Host "[*] $msg" -ForegroundColor Cyan }
}

function Write-Ok($msg) {
    if (-not $Silent) { Write-Host "[OK] $msg" -ForegroundColor Green }
}

function Write-Err($msg) {
    Write-Host "[ERR] $msg" -ForegroundColor Red
}

function Test-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if ($Uninstall) {
    Write-Step "Uninstalling $AppDisplayName..."

    if (-not (Test-Path $InstallDir)) {
        Write-Err "Installation not found at: $InstallDir"
        exit 1
    }

    Stop-Process -Name $AppExe -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    if (-not $Silent) {
        $confirm = Read-Host "Remove $AppDisplayName from $InstallDir? (y/N)"
        if ($confirm -ne 'y') { Write-Host "Cancelled."; exit 0 }
    }

    if (Test-Path $DesktopDir) {
        $shortcut = Join-Path $DesktopDir "$AppDisplayName.lnk"
        if (Test-Path $shortcut) { Remove-Item $shortcut -Force; Write-Step "Removed desktop shortcut" }
    }

    if (Test-Path $StartMenuDir) { Remove-Item $StartMenuDir -Recurse -Force; Write-Step "Removed Start Menu entries" }

    $regPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$AppId"
    if (Test-Path $regPath) { Remove-Item $regPath -Force; Write-Step "Removed Add/Remove Programs entry" }

    $regPathUser = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$AppId"
    if (Test-Path $regPathUser) { Remove-Item $regPathUser -Force; Write-Step "Removed Add/Remove Programs entry (x86)" }

    if (Test-Path $InstallDir) {
        Remove-Item $InstallDir -Recurse -Force
        Write-Ok "Removed installation directory"
    }

    Write-Ok "Uninstall complete."
    exit 0
}

if (-not (Test-Admin)) {
    Write-Err "Administrator privileges required. Please run PowerShell as Administrator."
    exit 1
}

if (-not (Test-Path "$SourceDir\$AppExe")) {
    Write-Err "$AppExe not found in: $SourceDir"
    Write-Host "  Make sure you run this script from the extracted directory." -ForegroundColor Yellow
    exit 1
}

Write-Step "Installing $AppDisplayName..."
Write-Step "Target: $InstallDir"

if (Test-Path $InstallDir) {
    if (-not $Silent) {
        $confirm = Read-Host "Installation already exists at:`n  $InstallDir`nOverwrite? (y/N)"
        if ($confirm -ne 'y') { Write-Host "Cancelled."; exit 0 }
    }
    Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null

Write-Step "Copying files..."
$copyItems = @($AppExe, 'agenmonster_desktop_lib.dll', 'WebView2Loader.dll')
if (Test-Path "$SourceDir\web") { $copyItems += 'web' }

foreach ($item in $copyItems) {
    $src = Join-Path $SourceDir $item
    $dst = Join-Path $InstallDir $item
    if (Test-Path $src) {
        Copy-Item $src $dst -Recurse -Force
    }
}

$mainExePath = Join-Path $InstallDir $AppExe
if (-not (Test-Path $mainExePath)) {
    Write-Err "Main executable not found after copy: $mainExePath"
    exit 1
}

if (-not $NoStartMenu) {
    Write-Step "Creating Start Menu entries..."
    if (Test-Path $StartMenuDir) { Remove-Item $StartMenuDir -Recurse -Force }
    New-Item $StartMenuDir -ItemType Directory -Force | Out-Null

    $lnk = Join-Path $StartMenuDir "$AppDisplayName.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($lnk)
    $shortcut.TargetPath = $mainExePath
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description = "$AppDisplayName - AI Agent Desktop"
    $shortcut.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null

    $uninstallLnk = Join-Path $StartMenuDir "Uninstall $AppDisplayName.lnk"
    $uninstallPath = Join-Path $InstallDir $UninstallExe
    $shortcut2 = $shell.CreateShortcut($uninstallLnk)
    $shortcut2.TargetPath = "powershell.exe"
    $shortcut2.Arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Uninstall -InstallDir `"$InstallDir`""
    $shortcut2.WorkingDirectory = $InstallDir
    $shortcut2.Description = "Uninstall $AppDisplayName"
    $shortcut2.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null

    Write-Ok "Start Menu entries created"
}

if (-not $NoDesktopShortcut) {
    Write-Step "Creating desktop shortcut..."
    $lnk = Join-Path $DesktopDir "$AppDisplayName.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($lnk)
    $shortcut.TargetPath = $mainExePath
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description = "$AppDisplayName - AI Agent Desktop"
    $shortcut.Save()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null
    Write-Ok "Desktop shortcut created"
}

$exeVersion = (Get-Item $mainExePath).VersionInfo
$version = $exeVersion.FileVersion
if (-not $version) { $version = '1.0.0' }

Write-Step "Registering Add/Remove Programs..."
$regRoot = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
$regPath = Join-Path $regRoot $AppId
if (-not (Test-Path $regPath)) { New-Item $regPath -ItemType Directory -Force | Out-Null }
$uninstallCmd = "powershell.exe -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Uninstall -InstallDir `"$InstallDir`""
Set-ItemProperty -Path $regPath -Name 'DisplayName' -Value $AppDisplayName
Set-ItemProperty -Path $regPath -Name 'DisplayVersion' -Value $version
Set-ItemProperty -Path $regPath -Name 'Publisher' -Value $AppPublisher
Set-ItemProperty -Path $regPath -Name 'InstallLocation' -Value $InstallDir
Set-ItemProperty -Path $regPath -Name 'UninstallString' -Value $uninstallCmd
Set-ItemProperty -Path $regPath -Name 'QuietUninstallString' -Value $uninstallCmd
Set-ItemProperty -Path $regPath -Name 'DisplayIcon' -Value $mainExePath
Set-ItemProperty -Path $regPath -Name 'EstimatedSize' -Value ([math]::Round((Get-ChildItem $InstallDir -File -Recurse | Measure-Object Length -Sum).Sum / 1KB))
Set-ItemProperty -Path $regPath -Name 'InstallDate' -Value (Get-Date -Format 'yyyyMMdd')
Set-ItemProperty -Path $regPath -Name 'NoModify' -Value 1
Set-ItemProperty -Path $regPath -Name 'NoRepair' -Value 1
Write-Ok "Registered in Add/Remove Programs"

if (-not (Test-Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$AppId")) {
    New-Item "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$AppId" -ItemType Directory -Force | Out-Null
    Copy-ItemProperty -Path $regPath -Destination "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\$AppId" -Force
}

Write-Step "Configuring Windows protocol handler..."
$protocolPath = "HKCU:\Software\Classes\$AppId"
if (-not (Test-Path $protocolPath)) {
    New-Item $protocolPath -ItemType Directory -Force | Out-Null
    New-Item "$protocolPath\shell\open\command" -ItemType Directory -Force | Out-Null
    Set-ItemProperty $protocolPath '(default)' "$AppDisplayName Protocol"
    Set-ItemProperty "$protocolPath\shell\open\command" '(default)' "`"$mainExePath`" `"%1`""
    Write-Ok "Protocol handler registered: $AppId://"
} else {
    Write-Step "Protocol handler already exists, skipping"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  $AppDisplayName installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Location: $InstallDir"
Write-Host "  Version:  $version"
Write-Host "  Start Menu: $StartMenuDir"
Write-Host "  Protocol:  $AppId://"
Write-Host ""
Write-Host "  Launch now? (Y/n):" -NoNewline -ForegroundColor Yellow
if (-not $Silent) {
    $launch = Read-Host " "
    if ($launch -ne 'n') { Start-Process $mainExePath -WorkingDirectory $InstallDir }
}
