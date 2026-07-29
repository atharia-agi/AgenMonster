import os

path = r'K:\AgenMonster\apps\desktop\src\lib\panels\CodeEditor.svelte'
with open(path, 'rb') as f:
    data = f.read()
lines = data.split(b'\n')

# Line 22 (0-indexed 21) - the rust icon
line = lines[21]
idx = line.find(b"icon: '")
icon_start = idx + 7
icon_end = line.find(b"'", icon_start)
icon_bytes = line[icon_start:icon_end]
print("Line 22 icon bytes:", icon_bytes.hex())
print("Line 22 icon length:", len(icon_bytes))
try:
    decoded = icon_bytes.decode('utf-8')
    print("Line 22 decoded:", repr(decoded))
    print("Line 22 char codes:", [hex(ord(c)) for c in decoded])
except Exception as e:
    print("Cannot decode:", e)

print()

# Line 67 (0-indexed 66) - the ts icon
line67 = lines[66]
idx67 = line67.find(b"icon: '")
icon_start67 = idx67 + 7
icon_end67 = line67.find(b"'", icon_start67)
icon_bytes67 = line67[icon_start67:icon_end67]
print("Line 67 icon bytes:", icon_bytes67.hex())
print("Line 67 icon length:", len(icon_bytes67))
try:
    decoded67 = icon_bytes67.decode('utf-8')
    print("Line 67 decoded:", repr(decoded67))
    print("Line 67 char codes:", [hex(ord(c)) for c in decoded67])
except Exception as e:
    print("Cannot decode:", e)

print()

# Also check the broken pattern from the user's description
# The user says ÃƒÂ°Ã…Â¸Ã¢â‚¬Å"Ã‹Å" should be 📂
# Let's see what the actual bytes are for a known broken string
# Line 22 in grep output: ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â€šÂ¬
target = "ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â€šÂ¬"
print("Looking for grep-reported pattern in file text...")
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()
if target in text:
    print("  FOUND as-is in text")
else:
    print("  NOT found as literal text")

# Let's check what grep was actually seeing
# The grep tool might be interpreting bytes differently
# Let's search for byte sequences
# Ã° = C3 B0 in UTF-8
# Å¸ = C5 B8 in UTF-8
# So if grep saw Ã°Å¸, the file contains bytes C3 B0 C5 B8
search1 = b'\xc3\xb0\xc5\xb8'
idx1 = data.find(search1)
print("\nSearching for bytes C3 B0 C5 B8 (Ã°Å¸):", "found at", idx1 if idx1 >= 0 else "NOT FOUND")

# Let's check for Ãƒ = C3 83
search2 = b'\xc3\x83'
idx2 = data.find(search2)
print("Searching for bytes C3 83 (Ãƒ):", "found at", idx2 if idx2 >= 0 else "NOT FOUND")

# What about the actual broken sequence ÃƒÂ° = C3 83 C2 B0?
search3 = b'\xc3\x83\xc2\xb0'
idx3 = data.find(search3)
print("Searching for bytes C3 83 C2 B0 (ÃƒÂ°):", "found at", idx3 if idx3 >= 0 else "NOT FOUND")
if idx3 >= 0:
    context = data[idx3:idx3+30]
    print("  Context hex:", context.hex())
    print("  Context decoded:", context.decode('utf-8', errors='replace'))

# What about triple-encoded? Let me check what ÃƒÂ°Ã…Â¸Ã¢â‚¬Å"Ã‹Å" really is
# The user says this maps to 📂
# 📂 = U+1F4C2 = F0 9F 93 82
# Double-encode: F0→C3 B0, 9F→C2 9F, 93→C2 93, 82→C2 82
# Triple-encode would be even more layers...
# Let's see what the actual byte sequence is

# From grep output for the gameState icon line 67:
# ÃƒÂ°Ã…Â¸Ã¢â‚¬Å"Ã‹Å"
# But from the repr output we got different chars
# Let me print ALL non-ASCII sequences in the file
import re
print("\nAll non-ASCII byte sequences > 4 bytes:")
for m in re.finditer(rb'[\xc0-\xff][\x80-\xbf]+', data):
    seq = m.group()
    if len(seq) > 6:
        line_num = data[:m.start()].count(b'\n') + 1
        try:
            decoded = seq.decode('utf-8')
            print(f"  Line {line_num}: hex={seq.hex()} len={len(seq)} decoded={repr(decoded)}")
        except:
            print(f"  Line {line_num}: hex={seq.hex()} len={len(seq)} (invalid UTF-8)")
