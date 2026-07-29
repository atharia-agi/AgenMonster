import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

with open(r'K:\AgenMonster\apps\desktop\src\lib\panels\CodeEditor.svelte', 'rb') as f:
    data = f.read()

content = data.decode('utf-8', errors='replace')
lines = content.split('\n')

# Check line 22
line22 = lines[21]
print("Line 22:", repr(line22[:150]))
print()

# Check line 67
line67 = lines[66]
print("Line 67:", repr(line67[:150]))
print()

# Find ALL remaining non-ASCII sequences
broken = list(re.finditer(r'[\x80-\uffff]+', content))
print(f"Total non-ASCII sequences: {len(broken)}")
for m in broken:
    seq = m.group()
    if len(seq) >= 2:
        line_num = content[:m.start()].count('\n') + 1
        print(f"  L{line_num}: {repr(seq)} ({len(seq)} chars)")
