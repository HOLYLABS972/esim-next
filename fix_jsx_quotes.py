#!/usr/bin/env python3
import re, os

# Fix unquoted Russian/Cyrillic text in JSX {} blocks
# {Загрузка планов...} -> {"Загрузка планов..."}
cyrillic_pattern = re.compile(r'\{([А-Яа-яёЁ][А-Яа-яёЁ0-9\s.,!?:;()\-+/\\@#$%&*=…–—№«»eSIM]+)\}')

count = 0
for root, dirs, files in os.walk('/opt/globalbanka'):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git')]
    for f in files:
        if not f.endswith(('.jsx', '.tsx')):
            continue
        path = os.path.join(root, f)
        with open(path) as fh:
            content = fh.read()
        orig = content
        content = cyrillic_pattern.sub(lambda m: '{"' + m.group(1) + '"}', content)
        if content != orig:
            with open(path, 'w') as fh:
                fh.write(content)
            count += 1
            print(f'Fixed: {path}')
print(f'Fixed {count} files')
