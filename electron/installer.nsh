; MD Reader NSIS customization: a "Create desktop shortcut" checkbox page.
; electron-builder is configured with createDesktopShortcut:false, so the
; template never touches the desktop link — this script owns it entirely.
; On silent installs (incl. auto-updates) the page is skipped and the state
; var stays empty, so an existing shortcut is left exactly as-is.
;
; Two compile-order constraints shape this file:
; 1. It is included BEFORE MUI2.nsh, so nothing here may reference MUI macros
;    at include time — the page functions live INSIDE customPageAfterChangeDir,
;    which electron-builder expands inside assistedInstaller.nsh (after MUI2).
; 2. It is compiled twice (installer + uninstaller pass); installer-only parts
;    are guarded with !ifndef BUILD_UNINSTALLER.

!include "nsDialogs.nsh"

!ifndef BUILD_UNINSTALLER

Var DesktopShortcutCheckbox
Var DesktopShortcutState

!macro customPageAfterChangeDir
  Page custom desktopShortcutPageCreate desktopShortcutPageLeave

  Function desktopShortcutPageCreate
    !insertmacro MUI_HEADER_TEXT "Shortcuts" "Choose how to launch MD Reader"
    nsDialogs::Create 1018
    Pop $0
    ${NSD_CreateCheckbox} 0 20u 100% 12u "Create a desktop shortcut"
    Pop $DesktopShortcutCheckbox
    ${NSD_SetState} $DesktopShortcutCheckbox ${BST_CHECKED}
    nsDialogs::Show
  FunctionEnd

  Function desktopShortcutPageLeave
    ${NSD_GetState} $DesktopShortcutCheckbox $DesktopShortcutState
  FunctionEnd
!macroend

; The user's checkbox choice is recorded here so silent UPDATE installs (which
; skip the page) can honor it. perMachine:false -> SHELL_CONTEXT is HKCU.
!define MDR_REG_KEY "Software\io.local.mdreader"

!macro customInstall
  ${If} ${isUpdated}
    ; Silent auto-update: the checkbox page never ran. Recreate the desktop
    ; shortcut unless the user opted out at install time. A missing value
    ; (updates from <=1.0.3, whose uninstaller wrongly deleted the shortcut
    ; during updates) defaults to recreate — this heals that transition.
    ReadRegStr $R9 SHELL_CONTEXT "${MDR_REG_KEY}" "DesktopShortcut"
    ${If} $R9 != "0"
      CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
    ${EndIf}
  ${Else}
    ${If} $DesktopShortcutState == ${BST_CHECKED}
      CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      WriteRegStr SHELL_CONTEXT "${MDR_REG_KEY}" "DesktopShortcut" "1"
    ${Else}
      Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
      WriteRegStr SHELL_CONTEXT "${MDR_REG_KEY}" "DesktopShortcut" "0"
    ${EndIf}
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend

!endif

!macro customUnInstall
  ; Updates run this uninstaller with --updated (and --keep-shortcuts); the
  ; desktop shortcut must only be removed on a REAL uninstall. This guard was
  ; missing in <=1.0.3 and ate the shortcut on every auto-update.
  ${ifNot} ${isUpdated}
    Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
    DeleteRegKey SHELL_CONTEXT "Software\io.local.mdreader"
  ${endIf}
!macroend
