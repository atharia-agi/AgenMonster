import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PANELS_DIR = r'K:\AgenMonster\apps\desktop\src\lib\panels'
RENDER_DIR = r'K:\AgenMonster\apps\desktop\src\lib\render'

# Complete cp1252 reverse mapping: Unicode code point -> cp1252 byte value
CP1252_REV = {
    0x0080: 0x80, 0x0082: 0x82, 0x0083: 0x83, 0x0084: 0x84,
    0x0085: 0x85, 0x0086: 0x86, 0x0087: 0x87, 0x0088: 0x88,
    0x0089: 0x89, 0x008A: 0x8A, 0x008B: 0x8B, 0x008C: 0x8C,
    0x008E: 0x8E, 0x0091: 0x91, 0x0092: 0x92, 0x0093: 0x93,
    0x0094: 0x94, 0x0095: 0x95, 0x0096: 0x96, 0x0097: 0x97,
    0x0098: 0x98, 0x0099: 0x99, 0x009A: 0x9A, 0x009B: 0x9B,
    0x009C: 0x9C, 0x009E: 0x9E, 0x009F: 0x9F,
    0x0152: 0x8C, 0x0153: 0x9C, 0x0160: 0x8A, 0x0161: 0x9A,
    0x017D: 0x8E, 0x017E: 0x9E, 0x0178: 0x9F, 0x0192: 0x83,
    0x02C6: 0x88, 0x02DC: 0x98,
    0x2013: 0x96, 0x2014: 0x97, 0x2018: 0x91, 0x2019: 0x92,
    0x201A: 0x82, 0x201C: 0x93, 0x201D: 0x94, 0x201E: 0x84,
    0x2020: 0x86, 0x2021: 0x87, 0x2022: 0x95, 0x2026: 0x85,
    0x2030: 0x89, 0x2039: 0x8B, 0x203A: 0x9B,
    0x20AC: 0x80, 0x2122: 0x99,
}

def unicode_to_cp1252(ch):
    """Convert a Unicode character to its cp1252 byte. Returns None if not representable."""
    cp = ord(ch)
    if cp < 256:
        return bytes([cp])
    if cp in CP1252_REV:
        return bytes([CP1252_REV[cp]])
    return None

def try_undo_one_layer(s):
    """Try to undo one layer of UTF-8->cp1252->UTF-8 encoding."""
    result = b''
    for ch in s:
        b = unicode_to_cp1252(ch)
        if b is None:
            return None
        result += b
    try:
        return result.decode('utf-8')
    except:
        return None

def fix_file(fpath):
    """Fix broken emoji encodings in a file."""
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    fixes = 0
    
    # Find all non-ASCII sequences
    for m in re.finditer(r'[\x80-\uffff]+', content):
        seq = m.group()
        if len(seq) < 2:
            continue
        
        # Try to undo one layer of encoding
        fixed = try_undo_one_layer(seq)
        if fixed and fixed != seq:
            content = content[:m.start()] + fixed + content[m.end():]
            fixes += 1
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return fixes
    return 0

# Process all files
svelte_dirs = [PANELS_DIR, RENDER_DIR]
all_files = []
for d in svelte_dirs:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.svelte'):
                all_files.append(os.path.join(root, f))

total_fixes = 0
files_fixed = {}

for fpath in all_files:
    basename = os.path.basename(fpath)
    fixes = fix_file(fpath)
    if fixes > 0:
        files_fixed[basename] = fixes
        total_fixes += fixes
        print(f"  {basename}: {fixes} replacements")

print(f"\nFiles fixed: {len(files_fixed)}")
print(f"Total replacements: {total_fixes}")
