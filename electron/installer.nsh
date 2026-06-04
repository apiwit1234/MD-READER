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

!macro customInstall
  ${If} $DesktopShortcutState == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${EndIf}
!macroend

!endif

!macro customUnInstall
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
!macroend
