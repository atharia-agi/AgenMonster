import os
import re

PANELS_DIR = r'K:\AgenMonster\apps\desktop\src\lib\panels'
RENDER_DIR = r'K:\AgenMonster\apps\desktop\src\lib\render'

# Search for the exact patterns the user specified
user_patterns = [
    'ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡',
    'ÃƒÂ°Ã…Â¸Ã…â€™Ã‚Â±',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬â„¢Ã‚Â§',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å"Ã…Â¡',
    'ÃƒÂ¢Ã…Â¡Ã¢â‚¬Â\x9dÃƒÂ¯Ã‚Â¸Ã‚Â\x8f',
    'ÃƒÂ°Ã…Â¸Ã…â€™Ã…Â¸',
    'ÃƒÂ¢Ã…Â¡Ã‚Â¡',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â\x90',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã…Â ',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â´',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â¤',
    'ÃƒÂ°Ã…Â¸Ã‚Â¤Ã‚Â©',
    'ÃƒÂ°Ã…Â¸Ã‚Â§Ã‚Â\x90',
    'ÃƒÂ°Ã…Â¸Ã‚Â¤Ã¢â‚¬Â\x9d',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â¢',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â¡',
    'ÃƒÂ°Ã…Â¸Ã‹Å"Ã‚Â«',
    'Ã°ÂµÂ§Â°',
    'Ã°Â§Ã¢Â',
    'Ã°Â§Ã…â€™',
    'Ã…Â¸Ã¢Â',
]

# Check which patterns exist in the files
svelte_dirs = [PANELS_DIR, RENDER_DIR]
all_files = []
for d in svelte_dirs:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.svelte'):
                all_files.append(os.path.join(root, f))

print(f"Checking {len(all_files)} .svelte files...\n")

for fpath in all_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    found_any = False
    for pat in user_patterns:
        if pat in content:
            count = content.count(pat)
            if not found_any:
                print(f"File: {os.path.basename(fpath)}")
                found_any = True
            print(f"  Pattern '{pat}' found {count} times")

    # Also search for broad broken patterns ( Ãƒ as indicator)
    if 'Ãƒ' in content:
        if not found_any:
            print(f"File: {os.path.basename(fpath)}")
            found_any = True
        # Find all occurrences with line numbers
        for m in re.finditer('Ãƒ', content):
            line_num = content[:m.start()].count('\n') + 1
            start = max(0, m.start() - 10)
            end = min(len(content), m.end() + 30)
            context = content[start:end].replace('\n', '\\n')
            # Don't print too many
            break  # Just check if it exists
    
    if not found_any:
        # Check for any Ã patterns
        a_count = content.count('Ã')
        if a_count > 0:
            pass  # Don't print files with just Ã

print("\n\nDone.")
