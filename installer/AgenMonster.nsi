!include "x64.nsh"

Name "AgenMonster"
OutFile "AgenMonster-1.0.0-setup.exe"
InstallDir "$PROGRAMFILES64\AgenMonster"
RequestExecutionLevel admin

Page directory
Page components
Page instfiles

!insertmacro MUI_PAGE_FINISH

Section "AgenMonster (required)"
  SectionIn RO
  SetOutPath "$INSTDIR"
  File "agenmonster-desktop.exe"
  File "agenmonster_desktop_lib.dll"
  File "WebView2Loader.dll"
  SetOutPath "$INSTDIR\web"
  File /r "web\*"

  WriteUninstaller "$INSTDIR\Uninstall-AgenMonster.exe"

  CreateShortCut "$DESKTOP\AgenMonster.lnk" "$INSTDIR\agenmonster-desktop.exe" "" "$INSTDIR\agenmonster-desktop.exe" 0
  CreateDirectory "$SMPROGRAMS\AgenMonster"
  CreateShortCut "$SMPROGRAMS\AgenMonster\AgenMonster.lnk" "$INSTDIR\agenmonster-desktop.exe" "" "$INSTDIR\agenmonster-desktop.exe" 0
  CreateShortCut "$SMPROGRAMS\AgenMonster\Uninstall AgenMonster.lnk" "$INSTDIR\Uninstall-AgenMonster.exe"

  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "DisplayName" "AgenMonster"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "Publisher" "AgenMonster"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "UninstallString" '"$INSTDIR\Uninstall-AgenMonster.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "QuietUninstallString" '"$INSTDIR\Uninstall-AgenMonster.exe" /S'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "DisplayIcon" "$INSTDIR\agenmonster-desktop.exe"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster" "NoRepair" 1

  WriteRegStr HKCU "Software\AgenMonster" "" "$INSTDIR"

  SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\agenmonster-desktop.exe"
  Delete "$INSTDIR\agenmonster_desktop_lib.dll"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\Uninstall-AgenMonster.exe"
  RMDir /r "$INSTDIR\web"
  RMDir "$INSTDIR"

  Delete "$DESKTOP\AgenMonster.lnk"
  Delete "$SMPROGRAMS\AgenMonster\AgenMonster.lnk"
  Delete "$SMPROGRAMS\AgenMonster\Uninstall AgenMonster.lnk"
  RMDir "$SMPROGRAMS\AgenMonster"

  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\AgenMonster"
  DeleteRegKey HKCU "Software\AgenMonster"
SectionEnd
