$panelsDir = 'K:\AgenMonster\apps\desktop\src\lib\panels'
$renderDir = 'K:\AgenMonster\apps\desktop\src\lib\render'
$svelteFiles = Get-ChildItem -Path $panelsDir,$renderDir -Filter '*.svelte' -Recurse -File

$totalReplacements = 0
$filesFixed = @{}

foreach ($file in $svelteFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    $originalContent = $content
    $fileReplacements = 0

    $replacements = [ordered]@{}

    # ---- Stage Emojis ----
    $replacements[[char]0x00E2 + [char]0x0083 + '°' + [char]0x00C3 + '°' + [char]0x00C2 + '¡'] = '🥚' # broken egg approximation - handle below with raw

    # We'll use -replace with [char] escapes for reliability
    # Define replacements as pairs of (broken, correct)
    $map = @()

    # Use raw hex byte patterns for double-encoded UTF-8
    # The pattern: original UTF-8 bytes were interpreted as Latin-1, then encoded to UTF-8 again
    # E.g. U+1F423 (🥚) = F0 9F 90 A3 -> each byte as Latin-1 char: F0=ð, 9F=Ÿ, 90=, A3=£
    # Then those chars re-encoded to UTF-8: ð=F0 9F, Ÿ=C2 9F, £=C2 A3, etc.
    # Result: F0 9F C2 9F C2 A3 -> displayed as garbled

    # Simplest approach: direct string replacements using the exact garbled sequences found in files
    # We'll read as bytes and search for exact byte sequences

    # Stage emojis
    $map += ,@(
        # 🥚 = U+1F423 = bytes F0 9F 90 A3, double-encoded
        [byte[]]@(0xC3, 0xB0, 0xC2, 0x9F, 0xC2, 0x90, 0xC2, 0xA3),
        [System.Text.Encoding]::UTF8.GetBytes([char]0xD83E + [char]0xDD23) # 🥚
    )
    $map += ,@(
        # 🐣 = U+1F423 (various broken forms)
        [byte[]]@(0xC3, 0xB0, 0xC2, 0x9F, 0xC2, 0x9F, 0xE2, 0x80, 0x99, 0xC2, 0xB1),
        [System.Text.Encoding]::UTF8.GetBytes([char]0xD83D + [char]0xDC23) # 🐣
    )

    # This byte-level approach is getting complex. Let me just use string replacement with the
    # exact sequences as read from the file content.
    $map = @()

    # Read the file content and do string replacements
    # The key insight: the file contains literal bytes that when decoded as UTF-8 produce
    # specific multi-byte sequences. We need to match those exact sequences.

    # Let me try a simpler approach: just search for the garbled text patterns

    # Actually, let me just use PowerShell's native string handling
    # The file content (read as UTF-8) contains specific character sequences
    # that represent the double-encoded emojis

    # I'll define them as [char] sequences to avoid encoding issues in the script itself
    $map = @()

    # Helper: create string from char codes
    function Make-Broken([int[]]$codes) {
        ($codes | ForEach-Object { [char]$_ }) -join ''
    }

    # ==================== STAGE EMOJIS ====================
    # 🥚 broken: ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡
    $map += ,@( (Make-Broken 0xC3 0x83 0xC2 0xB0 0xC3 0x83 0xC2 0xB0 0xC3 0x82 0xC2 0xA3 0xC3 0x82 0xC2 0xA3),
                 '🥚' )

    # This is getting unwieldy. Let me just use the literal strings from the file
    # and do simple .Replace() operations. The issue was PowerShell parsing of the
    # inline strings. If I read the broken strings from a data file, it works better.

    # SIMPLEST APPROACH: grep for the patterns in each file and replace
    break
}

Write-Host "Script needs redesign - using byte-level approach"
