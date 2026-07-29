#!/usr/bin/env python3
"""Fix double-encoded UTF-8 emoji strings in .svelte files."""
import os
import re

PANELS_DIR = r'K:\AgenMonster\apps\desktop\src\lib\panels'
RENDER_DIR = r'K:\AgenMonster\apps\desktop\src\lib\render'

# Comprehensive mapping: broken string -> correct emoji
# These are the literal garbled sequences as they appear in the files when read as UTF-8
REPLACEMENTS = {
    # ===== STAGE EMOJIS =====
    '\u00c3\u00b0\u00c2\u009f\u00c2\u00a3': '🥚',  # ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡  -> 🥚 (approx)

    # ===== MOOD EMOJIS =====
    '\u00c3\u00b0\u00c2\u009f\u00c2\u0098\u00c2\u0090': '😐',  # ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â\x90 -> 😐
    '\u00c3\u00b0\u00c2\u009f\u00c2\u0098\u00c2\u00a0': '😊',  # ÃƒÂ°Ã…Â¸Ã‹Å"Ã…Â  -> 😊
    '\u00c3\u00b0\u00c2\u009f\u00c2\u0098\u00c2\u00a4': '😤',  # ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â¤ -> 😤
    '\u00c3\u00b0\u00c2\u009f\u00c2\u00a4\u00c2\u00a9': '🎉',  # ÃƒÂ°Ã…Â¸Ã‚Â¤Ã‚Â© -> 🎉
    '\u00c3\u00b0\u00c2\u009f\u00c2\u00a7\u00c2\u0090': '🎯',  # ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â\x90 -> 🎯

    # ===== TOOL/ACTIVITY EMOJIS =====
    '\u00c3\u00b0\u00c2\u00b5\u00c2\u00a7\u00c2\u00b0': '⚡',  # Ã°ÂµÂ§Â° -> ⚡
    '\u00c3\u00b0\u00c2\u00a7\u00c2\u00a2': '🔥',  # Ã°Â§Ã¢Â -> 🔥

    # ===== COMMON BROKEN PATTERNS =====
    '\u00c3\u00a3\u00e2\u0080\u00a6': '…',  # ellipsis
    '\u00c3\u00a3\u00e2\u0082\u00ac': '€',  # euro sign

    # ===== SPECIFIC PATTERNS FROM FILES =====

    # Broken arrow symbols: ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â (em dash)
    '\u00c3\u00a3\u00e2\u0080\u00a6\u00c2\u00a6\u00c3\u00a3\u00e2\u0080\u00a6\u00c2\u00a6': '—',

    # ===== BROADER CATCHES FOR DOUBLE-ENCODED EMOJIS =====
    # These patterns catch many double-encoded common emojis
    # Pattern: ÃƒÂ°Ã…Â¸ = start of most double-encoded emoji (U+1F___)
    # Pattern: ÃƒÂ¢ = start of some double-encoded symbols (U+2___)
    # Pattern: ÃƒÆ’ = start of some double-encoded symbols (U+2___)
}

def get_replacements():
    """Build the full replacement map with exact byte-level patterns."""
    # Read the actual files to find exact broken sequences
    # But first, let's try with the literal strings

    replacements = {}

    # These are the EXACT garbled sequences as they appear when the double-encoded
    # file is read as UTF-8. Each "character" in the garbled string is actually
    # a valid UTF-8 sequence representing a Latin-1 character.

    # I'll build them from the code points of the garbled display
    def s(*codes):
        return ''.join(chr(c) for c in codes)

    # Stage Emojis
    # 🥚 = U+1F423 -> double encoded
    # Original bytes: F0 9F 90 A3
    # Double encoded: C3 B0 C2 9F C2 90 C2 A3 (but that's what we get from file)
    # Displayed as: Ã°Â¤Â£ or similar
    # From grep: ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡
    # Characters: U+00C3 U+0083 U+00C2 U+00B0 U+00C3 U+0083 U+00C2 U+00B0 U+00C3 U+0082 U+00C2 U+00A3 U+00C3 U+0082 U+00C2 U+00A3

    # Wait, looking at the grep output more carefully:
    # The grep output shows: ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡
    # But the actual bytes in the file when read as UTF-8 would be the character codes
    # of those Latin-1 characters.

    # Let me just read a file and find the exact sequences
    return replacements


def find_broken_sequences_in_files(dirs):
    """Scan files and collect all broken emoji sequences."""
    sequences = set()
    for d in dirs:
        for root, _, files in os.walk(d):
            for f in files:
                if f.endswith('.svelte'):
                    path = os.path.join(root, f)
                    with open(path, 'r', encoding='utf-8', errors='replace') as fh:
                        content = fh.read()
                    # Find sequences that look like double-encoded UTF-8
                    # These typically contain sequences like Ã, Â, °, etc.
                    for m in re.finditer(r'[\xc0-\xff][\x80-\xbf]+', content):
                        seq = m.group()
                        if len(seq) > 4:  # Only multi-byte garbled sequences
                            sequences.add(seq)
    return sequences


def main():
    svelte_dirs = [PANELS_DIR, RENDER_DIR]

    # First, let's discover what exact broken sequences exist in the files
    print("Scanning for broken sequences...")
    found_sequences = find_broken_sequences_in_files(svelte_dirs)
    print(f"Found {len(found_sequences)} unique multi-byte sequences")
    for seq in sorted(found_sequences, key=len, reverse=True)[:30]:
        print(f"  [{len(seq)}] {repr(seq)}")

    # Now let's read one file to understand the exact patterns
    test_file = os.path.join(PANELS_DIR, 'CodeEditor.svelte')
    if os.path.exists(test_file):
        with open(test_file, 'r', encoding='utf-8') as fh:
            content = fh.read()
        # Find broken emoji patterns
        print(f"\nSample from CodeEditor.svelte:")
        for m in re.finditer(r'[\xc0-\xff][\x80-\xbf]+', content):
            if len(m.group()) > 6:
                line_num = content[:m.start()].count('\n') + 1
                print(f"  Line {line_num}: {repr(m.group())}")


if __name__ == '__main__':
    main()
