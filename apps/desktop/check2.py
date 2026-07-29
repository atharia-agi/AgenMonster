import os
import re
import sys

# Force UTF-8 output
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

# For each file, find ALL non-ASCII sequences that could be broken emojis
# A broken double-encoded emoji will be a long sequence of Latin-1 characters
# that when the file is read as UTF-8, produce code points in the 0xC0-0xFF range

results = {}
for fpath in all_files:
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    basename = os.path.basename(fpath)
    
    # Search for known broken byte sequences
    # The user specified patterns like ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡
    # These are multi-byte UTF-8 sequences that represent Latin-1 characters
    
    # Let's find all sequences of 3+ non-ASCII bytes
    # Actually, let's look for the specific byte patterns
    
    # Check for common double-encoded emoji byte patterns
    # A double-encoded emoji (U+1Fxxx) stored as UTF-8 bytes of Latin-1 chars:
    # F0->C3 B0, 9F->C2 9F, xx->C2 xx (for bytes < 0x80) or C3 xx (for bytes >= 0x80)
    # So the byte sequence would be: C3 B0 C2 9F C2 xx [C2 yy]
    
    # Triple-encoded (what we likely have):
    # Each byte of the above gets encoded again...
    
    # Let's just search for common Latin-1 sequences that indicate broken emojis
    # The key marker bytes: C3 83 (Ãƒ), C3 82 (Ã‚), C3 85 (Ã…), etc.
    
    # Actually, let's just find all the garbled sequences by looking for
    # long runs of bytes in the C2-C3 range
    
    # Find all positions with Ã (C3 83 in UTF-8 = Ã)
    # The grep tool showed Ãƒ in the results, which is C3 83 C3 83 in the file
    
    # Let me search for the ACTUAL broken strings as the user described them
    # by reading the file as UTF-8 and searching for the garbled characters
    
    content = raw.decode('utf-8', errors='replace')
    
    # Find all sequences that start with Ã and are followed by non-ASCII chars
    # These are the double/triple encoded sequences
    broken_seqs = []
    for m in re.finditer(r'[\xc0-\xff][\x80-\xbf]+', content):
        seq = m.group()
        if len(seq) >= 6:  # At least 3 double-byte chars
            line_num = content[:m.start()].count('\n') + 1
            broken_seqs.append((line_num, m.start(), seq))
    
    if broken_seqs:
        results[basename] = broken_seqs

# Print results
for fname, seqs in sorted(results.items()):
    print(f"\n{fname}: {len(seqs)} broken sequences")
    for line_num, pos, seq in seqs[:5]:  # Show first 5
        # Show the hex of each character's code point
        codes = [hex(ord(c)) for c in seq]
        print(f"  L{line_num}: {seq} (codes: {codes})")
    if len(seqs) > 5:
        print(f"  ... and {len(seqs) - 5} more")
