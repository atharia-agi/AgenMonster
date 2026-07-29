import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PANELS_DIR = r'K:\AgenMonster\apps\desktop\src\lib\panels'
RENDER_DIR = r'K:\AgenMonster\apps\desktop\src\lib\render'

# cp1252 reverse mapping: Unicode code point -> cp1252 byte value
CP1252_REV = {
    0x0152: 0x8C, 0x0153: 0x9C, 0x0160: 0x8A, 0x0161: 0x9A,
    0x017D: 0x8E, 0x017E: 0x9E, 0x0192: 0x83,
    0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92,
    0x201A: 0x82, 0x201C: 0x93, 0x201D: 0x94,
    0x2020: 0x86, 0x2021: 0x87, 0x2026: 0x85,
    0x2030: 0x89, 0x2039: 0x8B, 0x203A: 0x9B,
    0x20AC: 0x80, 0x2122: 0x99,
}

def unicode_to_cp1252_char(ch):
    """Convert a Unicode character to its cp1252 byte value."""
    cp = ord(ch)
    if cp < 256:
        return bytes([cp])
    if cp in CP1252_REV:
        return bytes([CP1252_REV[cp]])
    return None

def try_decode_triple(content):
    """Try to decode triple-encoded emoji: UTF-8 -> cp1252 -> UTF-8 -> cp1252 -> UTF-8"""
    # Find sequences of non-ASCII chars
    results = []
    i = 0
    while i < len(content):
        if ord(content[i]) >= 0x80:
            j = i
            while j < len(content) and ord(content[j]) >= 0x80:
                j += 1
            seq = content[i:j]
            if len(seq) >= 4:
                # Try to decode
                decoded = try_decode_seq(seq)
                if decoded:
                    results.append((i, j, seq, decoded))
            i = j
        else:
            i += 1
    return results

def try_decode_seq(seq):
    """Try to decode a potentially triple-encoded emoji sequence."""
    # Layer 3 undo: map each char to cp1252 byte
    layer2_bytes = b''
    for ch in seq:
        b = unicode_to_cp1252_char(ch)
        if b is None:
            return None
        layer2_bytes += b
    
    # Layer 2 undo: decode as UTF-8, then map to cp1252
    try:
        layer2_str = layer2_bytes.decode('utf-8')
    except:
        return None
    
    layer1_bytes = b''
    for ch in layer2_str:
        b = unicode_to_cp1252_char(ch)
        if b is None:
            return None
        layer1_bytes += b
    
    # Layer 1 undo: decode as UTF-8
    try:
        original = layer1_bytes.decode('utf-8')
    except:
        return None
    
    return original

# First, let's understand what's in the files
svelte_dirs = [PANELS_DIR, RENDER_DIR]
all_files = []
for d in svelte_dirs:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.svelte'):
                all_files.append(os.path.join(root, f))

print(f"Processing {len(all_files)} files...")

total_fixes = 0
file_fixes = {}

for fpath in all_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    basename = os.path.basename(fpath)
    original = content
    fixes = 0
    
    # Find all non-ASCII sequences
    for m in re.finditer(r'[\x80-\uffff]+', content):
        seq = m.group()
        if len(seq) < 3:
            continue
        
        # Check if this looks like a broken emoji
        has_high = any(ord(c) > 0x2000 for c in seq)
        has_low = any(0x80 <= ord(c) <= 0xFF for c in seq)
        
        if has_high or (has_low and len(seq) >= 4):
            decoded = try_decode_seq(seq)
            if decoded and len(decoded) <= 10 and all(ord(c) > 127 for c in decoded):
                content = content.replace(seq, decoded)
                fixes += 1
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        file_fixes[basename] = fixes
        total_fixes += fixes
        print(f"  Fixed {basename}: {fixes} replacements")

print(f"\nTotal files fixed: {len(file_fixes)}")
print(f"Total replacements: {total_fixes}")
