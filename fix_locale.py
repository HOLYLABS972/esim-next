#!/usr/bin/env python3
"""Add const locale = 'ru' where locale is used but not defined."""
import re, os

base = '/opt/globalbanka'
count = 0

for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git')]
    for f in files:
        if not f.endswith(('.jsx', '.tsx')):
            continue
        path = os.path.join(root, f)
        with open(path) as fh:
            content = fh.read()
        
        # Skip if no locale usage
        if 'locale' not in content:
            continue
        
        # Skip if locale is already defined (const locale = or already has it)
        if "const locale = 'ru'" in content or 'const locale = "ru"' in content:
            continue
        
        # Skip I18nContext itself
        if 'I18nContext' in f:
            continue
        
        # Check if locale is used as a variable (not just in comments or strings)
        # and not already defined
        has_locale_def = bool(re.search(r'const\s+locale\b', content)) or bool(re.search(r'let\s+locale\b', content))
        has_locale_use = bool(re.search(r'\blocale\b', content))
        
        if has_locale_use and not has_locale_def:
            # Add const locale = 'ru' after the last import or at the start of component
            # Find the function component or export default
            # Insert after imports
            lines = content.split('\n')
            insert_idx = 0
            for i, line in enumerate(lines):
                if line.strip().startswith('import ') or line.strip().startswith("import{"):
                    insert_idx = i + 1
                elif line.strip().startswith('from '):
                    insert_idx = i + 1
            
            # If no imports found, look for 'use client'
            if insert_idx == 0:
                for i, line in enumerate(lines):
                    if "'use client'" in line or '"use client"' in line:
                        insert_idx = i + 1
                        break
            
            lines.insert(insert_idx, "const locale = 'ru';")
            content = '\n'.join(lines)
            
            with open(path, 'w') as fh:
                fh.write(content)
            count += 1
            print(f'Fixed: {path}')

print(f'Added locale const to {count} files')
