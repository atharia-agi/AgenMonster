import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PANELS_DIR = r'K:\AgenMonster\apps\desktop\src\lib\panels'
RENDER_DIR = r'K:\AgenMonster\apps\desktop\src\lib\render'

svelte_dirs = [PANELS_DIR, RENDER_DIR]
all_files = []
for d in svelte_dirs:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.svelte'):
                all_files.append(os.path.join(root, f))

print(f"Checking {len(all_files)} .svelte files...")

# Read CodeEditor.svelte line 22 and show EXACTLY what we're dealing with
fpath = os.path.join(PANELS_DIR, 'CodeEditor.svelte')
with open(fpath, 'rb') as f:
    raw = f.read()

lines = raw.split(b'\n')
line22 = lines[21]  # 0-indexed

# Find the icon value
idx = line22.find(b"icon: '")
if idx >= 0:
    icon_start = idx + 7
    icon_end = line22.find(b"'", icon_start)
    icon_bytes = line22[icon_start:icon_end]
    
    print(f"\nLine 22 icon:")
    print(f"  Raw bytes hex: {icon_bytes.hex()}")
    print(f"  Byte count: {len(icon_bytes)}")
    
    # Decode as UTF-8
    decoded = icon_bytes.decode('utf-8')
    print(f"  Decoded string: {decoded}")
    print(f"  Char count: {len(decoded)}")
    print(f"  Char codes: {[hex(ord(c)) for c in decoded]}")
    
    # Now let's understand the encoding layers
    # The decoded string chars are Latin-1-like characters
    # If we re-encode them as Latin-1 (cp1252), we get the original bytes
    try:
        original_bytes = decoded.encode('cp1252')
        print(f"  Re-encoded as cp1252: {original_bytes.hex()}")
        # Now decode those bytes as UTF-8 (the original encoding)
        try:
            original = original_bytes.decode('utf-8')
            print(f"  Original (after undoing double-encode): {original}")
            # That should give us the correct emoji!
            cp = [hex(ord(c)) for c in original]
            print(f"  Original code points: {cp}")
        except:
            print("  Cannot decode as UTF-8 after cp1252 re-encode")
    except Exception as e:
        print(f"  Cannot re-encode as cp1252: {e}")
    
    # Try latin-1 instead
    try:
        original_bytes_lat = decoded.encode('latin-1')
        print(f"  Re-encoded as latin-1: {original_bytes_lat.hex()}")
        try:
            original_lat = original_bytes_lat.decode('utf-8')
            print(f"  Original (latin-1 path): {original_lat}")
        except:
            print("  Cannot decode as UTF-8 after latin-1 re-encode")
    except Exception as e:
        print(f"  Cannot re-encode as latin-1: {e}")

print("\n" + "="*60)

# Now check the ACTUAL grep-reported pattern
# grep showed: ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â€šÂ¬
# Let me search for this exact byte sequence in the file
# ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â€šÂ¬ as UTF-8 bytes:
target_str = '\u00c3\u0083\u00c2\u00b0\u00c3\u0083\u00c2\u00b0\u00c3\u0082\u00c2\u00a3\u00c3\u0082\u00c2\u00a3'
target_bytes = target_str.encode('utf-8')
print(f"\nSearching for grep-reported ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â€šÂ¬")
print(f"  As UTF-8 bytes: {target_bytes.hex()}")
idx = raw.find(target_bytes)
print(f"  Found at byte offset: {idx}")

# Also search for the simpler version
target2_str = '\u00c3\u00b0'
target2_bytes = target2_str.encode('utf-8')
print(f"\nSearching for Ã° (C3 B0): {target2_bytes.hex()}")
count = raw.count(target2_bytes)
print(f"  Found {count} times")

# What about just the 4-byte sequence from grep?
# The grep tool might interpret bytes differently
# Let me check: what does grep display when it reads this file?
# It showed ÃƒÂ°... so that's the UTF-8 representation of U+00C3 U+0083...
# But the file contains different bytes

# Let me just check: what's the ACTUAL content of the icon field?
print("\n" + "="*60)
print("ACTUAL icon content in file (line 22):")
print(f"  As displayed: {decoded}")
print(f"  This IS the broken emoji - it's a sequence of Latin-1 characters")
print(f"  that represent double-encoded UTF-8 bytes")
