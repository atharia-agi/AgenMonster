import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

PANELS_DIR = r'K:\AgenMonster\apps\desktop\src\lib\panels'
RENDER_DIR = r'K:\AgenMonster\apps\desktop\src\lib\render'

def fix_double_encoded(content):
    """Fix triple-encoded emoji strings.
    
    The encoding chain is: original UTF-8 -> interpreted as cp1252 -> encoded to UTF-8 -> 
    interpreted as cp1252 again -> encoded to UTF-8 again.
    
    To undo: read as UTF-8 -> encode as cp1252 -> encode as cp1252 again -> decode as UTF-8
    """
    # Find all sequences of non-ASCII characters that could be broken emojis
    # These are sequences where each "character" has a code point in the Latin-1 range
    # or slightly above (due to intermediate encoding layers)
    
    result = []
    i = 0
    fixed_count = 0
    
    while i < len(content):
        # Check if this character starts a broken sequence
        # Broken sequences start with characters like Ã (0xC3), Â (0xC2), etc.
        if ord(content[i]) >= 0xC0 and i + 1 < len(content) and ord(content[i+1]) >= 0x80:
            # Try to extract a complete broken sequence
            j = i
            while j < len(content) and ((ord(content[j]) >= 0x80 and ord(content[j]) <= 0xFF) or 
                                         content[j] in '\u0192\u2026\u201a\u20ac\u0161\u2018\u2019\u201c\u201d\u2013\u2014\u0152\u0153'):
                j += 1
            
            if j - i >= 4:  # At least 2 double-byte sequences
                broken_seq = content[i:j]
                
                # Try to fix it
                try:
                    # Layer 3: re-encode as cp1252 (but some chars may not be in cp1252)
                    # First, try to normalize the characters to their cp1252 equivalents
                    normalized = ''
                    for ch in broken_seq:
                        cp = ord(ch)
                        if cp < 256:
                            normalized += ch
                        elif cp == 0x0192:  # ƒ -> use f equivalent
                            normalized += chr(0x83)  # cp1252 ƒ is 0x83
                        elif cp == 0x2026:  # … -> use ellipsis
                            normalized += chr(0x85)  # cp1252 … is 0x85
                        elif cp == 0x201A:  # ‚ -> use comma
                            normalized += chr(0x82)  # cp1252 ‚ is 0x82
                        elif cp == 0x20AC:  # € -> euro sign
                            normalized += chr(0x80)  # cp1252 € is 0x80
                        elif cp == 0x0161:  # š -> use s equivalent
                            normalized += chr(0x9A)  # cp1252 š is 0x9A (but > 0xFF for str)
                            normalized = normalized[:-1]  # undo
                            # Actually cp1252 maps U+0161 to 0x9A which IS < 256
                            normalized += chr(0x9A)
                        elif cp == 0x2018:  # ' -> left single quote
                            normalized += chr(0x91)
                        elif cp == 0x2019:  # ' -> right single quote
                            normalized += chr(0x92)
                        elif cp == 0x201C:  # " -> left double quote
                            normalized += chr(0x93)
                        elif cp == 0x201D:  # " -> right double quote
                            normalized += chr(0x94)
                        elif cp == 0x2013:  # – -> en dash
                            normalized += chr(0x96)
                        elif cp == 0x2014:  # — -> em dash
                            normalized += chr(0x97)
                        elif cp == 0x0152:  # Œ
                            normalized += chr(0x8C)
                        elif cp == 0x0153:  # œ
                            normalized += chr(0x9C)
                        else:
                            # Unknown character, can't fix this sequence
                            normalized = None
                            break
                    
                    if normalized is not None:
                        # Layer 2: the normalized string IS cp1252 bytes
                        layer2_bytes = normalized.encode('cp1252', errors='strict')
                        
                        # Layer 1: decode those bytes as cp1252 to get the original UTF-8 bytes
                        # Wait, we need to re-encode as cp1252 to get the double-encoded bytes,
                        # then decode as cp1252 to get the original bytes
                        
                        # Actually the chain is:
                        # Original UTF-8 bytes -> interpreted as cp1252 -> encoded to UTF-8 (this is layer 2)
                        # Then that UTF-8 -> interpreted as cp1252 -> encoded to UTF-8 (this is layer 3)
                        
                        # So to undo layer 3: UTF-8 decode (already done) -> cp1252 encode
                        # That gives us the layer 2 UTF-8 bytes
                        # Then to undo layer 2: UTF-8 decode -> cp1252 encode
                        # That gives us the original UTF-8 bytes
                        # Then decode as UTF-8
                        
                        # Layer 3 undo: we have the string, encode as cp1252
                        layer2_utf8 = normalized.encode('cp1252')
                        
                        # Layer 2 undo: decode as UTF-8, then encode as cp1252
                        layer1_str = layer2_utf8.decode('utf-8')
                        layer1_bytes = layer1_str.encode('cp1252', errors='strict')
                        
                        # Layer 1 undo: decode as UTF-8
                        original = layer1_bytes.decode('utf-8')
                        
                        # Check if it's a valid emoji
                        if all(ord(c) > 127 for c in original) and len(original) <= 10:
                            result.append(original)
                            fixed_count += 1
                            i = j
                            continue
                except Exception as e:
                    pass
            
            result.append(content[i])
            i += 1
        else:
            result.append(content[i])
            i += 1
    
    return ''.join(result), fixed_count


# Test the decoding on a known broken string
test_str = 'ÃƒÂ°Ã…Â¸Ã‚Â¦Ã¢â€šÂ¬'
print(f"Test string: {test_str}")
try:
    normalized = ''
    for ch in test_str:
        cp = ord(ch)
        if cp < 256:
            normalized += ch
        elif cp == 0x0192:
            normalized += chr(0x83)
        elif cp == 0x2026:
            normalized += chr(0x85)
        elif cp == 0x201A:
            normalized += chr(0x82)
        elif cp == 0x20AC:
            normalized += chr(0x80)
        elif cp == 0x0161:
            normalized += chr(0x9A)
        else:
            normalized += ch
    
    layer2_utf8 = normalized.encode('cp1252')
    print(f"  Layer 2 UTF-8 bytes: {layer2_utf8.hex()}")
    
    layer1_str = layer2_utf8.decode('utf-8')
    print(f"  Layer 1 string: {layer1_str}")
    print(f"  Layer 1 char codes: {[hex(ord(c)) for c in layer1_str]}")
    
    layer1_bytes = layer1_str.encode('cp1252')
    print(f"  Original UTF-8 bytes: {layer1_bytes.hex()}")
    
    original = layer1_bytes.decode('utf-8')
    print(f"  Original: {original}")
    print(f"  Original code points: {[hex(ord(c)) for c in original]}")
except Exception as e:
    print(f"  Error: {e}")

print()

# Also test with a simpler approach: just search for known broken strings
# and replace them with known correct emojis
# Build the mapping by trying the triple-decode on each
test_strings = [
    'ÃƒÂ°Ã…Â¸Ã‚Â¥Ã…Â¡',
    'ÃƒÂ°Ã…Â¸Ã…\u2019Ã‚Â±',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬\u201eÃ‚Â§',
    'ÃƒÂ°Ã…Â¸Ã¢â‚¬Å\u009cÃ…Â¡',
    'ÃƒÂ¢Ã…Â¡Ã¢â‚¬Â\x9dÃƒÂ¯Ã‚Â¸Ã‚Â\x8f',
    'ÃƒÂ°Ã…Â¸Ã…\u2019Ã…Â¸',
    'ÃƒÂ¢Ã…Â¡Ã‚Â¡',
]

for ts in test_strings:
    try:
        normalized = ''
        for ch in ts:
            cp = ord(ch)
            if cp < 256:
                normalized += ch
            elif cp == 0x0192: normalized += chr(0x83)
            elif cp == 0x2026: normalized += chr(0x85)
            elif cp == 0x201A: normalized += chr(0x82)
            elif cp == 0x20AC: normalized += chr(0x80)
            elif cp == 0x0161: normalized += chr(0x9A)
            elif cp == 0x2018: normalized += chr(0x91)
            elif cp == 0x2019: normalized += chr(0x92)
            elif cp == 0x201C: normalized += chr(0x93)
            elif cp == 0x201D: normalized += chr(0x94)
            elif cp == 0x2013: normalized += chr(0x96)
            elif cp == 0x2014: normalized += chr(0x97)
            elif cp == 0x0152: normalized += chr(0x8C)
            elif cp == 0x0153: normalized += chr(0x9C)
            else:
                normalized += ch
        
        layer2_utf8 = normalized.encode('cp1252')
        layer1_str = layer2_utf8.decode('utf-8')
        layer1_bytes = layer1_str.encode('cp1252')
        original = layer1_bytes.decode('utf-8')
        print(f"  {ts} -> {original} (U+{' '.join(hex(ord(c))[2:].upper() for c in original)})")
    except Exception as e:
        print(f"  {ts} -> ERROR: {e}")
