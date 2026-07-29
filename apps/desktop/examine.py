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

# Read all files and find the ACTUAL broken strings (as UTF-8 decoded)
# along with their raw byte patterns
for fpath in all_files[:5]:  # Check first 5 files
    with open(fpath, 'rb') as f:
        raw = f.read()
    
    basename = os.path.basename(fpath)
    content = raw.decode('utf-8', errors='replace')
    
    # Find non-ASCII sequences
    found = []
    for m in re.finditer(r'[\x80-\uffff]+', content):
        seq = m.group()
        if len(seq) >= 3:
            # Get the raw bytes for this sequence
            seq_bytes = raw[m.start():m.end()]
            found.append((m.start(), seq, seq_bytes.hex()))
    
    if found:
        print(f"\n{basename}: {len(found)} non-ASCII sequences")
        for pos, seq, hex_bytes in found[:3]:
            print(f"  pos={pos}: chars={repr(seq)} hex={hex_bytes}")
