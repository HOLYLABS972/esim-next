#!/usr/bin/env python3
"""Remove i18n from globalbanka - v2, more careful."""
import json
import re
import os

# Load Russian translations
with open('/opt/globalbanka/public/locales/ru/common.json', 'r') as f:
    translations = json.load(f)

def get_translation(key):
    keys = key.split('.')
    value = translations
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return None
    return value if isinstance(value, str) else None

def escape_jsx(s):
    """Escape a string for JSX attribute or content."""
    return s.replace('\\', '\\\\').replace('"', '\\"')

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    original = content
    
    # Step 1: Remove useI18n imports
    content = re.sub(
        r"import\s*\{\s*useI18n\s*\}\s*from\s*['\"][^'\"]*I18nContext['\"];\s*\n?",
        '', content
    )
    
    # Step 2: Replace `const { t, locale, ... } = useI18n();` with `const locale = 'ru';`
    # Match various destructuring patterns
    content = re.sub(
        r"\s*const\s*\{[^}]*\}\s*=\s*useI18n\(\);\s*\n?",
        "\n  const locale = 'ru';\n",
        content
    )
    
    # Step 3: Replace t() calls - ONLY standalone t( not preceded by . or alphanumeric
    # Pattern: word-boundary t('key', 'fallback') or t('key')
    # Use negative lookbehind to avoid matching .get(, .set(, etc.
    
    def replace_t_with_fallback(match):
        prefix = match.group(1)  # could be { or space or ( etc
        key = match.group(2)
        fallback = match.group(3)
        russian = get_translation(key)
        text = russian if russian else fallback
        if not text:
            text = key
        escaped = escape_jsx(text)
        return prefix + '"' + escaped + '"'
    
    def replace_t_simple(match):
        prefix = match.group(1)
        key = match.group(2)
        russian = get_translation(key)
        text = russian if russian else key
        escaped = escape_jsx(text)
        return prefix + '"' + escaped + '"'
    
    # t('key', 'fallback') - with single or double quotes
    # Negative lookbehind for word chars and dot to avoid .get() etc.
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*'([^']+)'\s*,\s*'([^']*)'\s*\)""",
        replace_t_with_fallback,
        content
    )
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\)""",
        replace_t_with_fallback,
        content
    )
    # Mixed quotes: t('key', "fallback")
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*'([^']+)'\s*,\s*"([^"]*)"\s*\)""",
        replace_t_with_fallback,
        content
    )
    
    # t('key') - no fallback
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*'([^']+)'\s*\)""",
        replace_t_simple,
        content
    )
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*"([^"]+)"\s*\)""",
        replace_t_simple,
        content
    )
    
    # Step 4: Handle t() with 3 args (variables) - t('key', 'fallback', { var: val })
    # These need to become template literals
    def replace_t_with_vars(match):
        prefix = match.group(1)
        key = match.group(2)
        fallback = match.group(3)
        vars_str = match.group(4)
        russian = get_translation(key)
        text = russian if russian else fallback
        if not text:
            text = key
        
        # Check if text has {{variable}} placeholders
        if '{{' in text:
            # Parse vars object to get variable mappings
            # e.g. { name: userName, count: 5 }
            var_pairs = re.findall(r'(\w+)\s*:\s*([^,}]+)', vars_str)
            for var_name, var_value in var_pairs:
                text = text.replace('{{' + var_name + '}}', '${' + var_value.strip() + '}')
            escaped = text.replace('\\', '\\\\').replace('`', '\\`')
            return prefix + '`' + escaped + '`'
        else:
            escaped = escape_jsx(text)
            return prefix + '"' + escaped + '"'
    
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*(\{[^}]*\})\s*\)""",
        replace_t_with_vars,
        content
    )
    content = re.sub(
        r"""(?<![.\w])(\{?\s*)t\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*,\s*(\{[^}]*\})\s*\)""",
        replace_t_with_vars,
        content
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  Modified: {filepath}")
        return True
    return False

# Only process UI files
ui_dirs = [
    '/opt/globalbanka/src/components',
    '/opt/globalbanka/app',
]

# Also process specific files
specific_files = [
    '/opt/globalbanka/src/contexts/I18nContext.jsx',
    '/opt/globalbanka/src/utils/languageUtils.js',
]

modified = 0
processed = set()

for ui_dir in ui_dirs:
    for root, dirs, files in os.walk(ui_dir):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git')]
        for fname in files:
            if fname.endswith(('.jsx', '.tsx')):
                fpath = os.path.join(root, fname)
                # Skip API routes
                if '/api/' in fpath:
                    continue
                if fpath in processed:
                    continue
                processed.add(fpath)
                try:
                    with open(fpath) as f:
                        content = f.read()
                    if 'useI18n' in content or re.search(r"(?<![.\w])t\(", content):
                        if process_file(fpath):
                            modified += 1
                except Exception as e:
                    print(f"  Error: {fpath}: {e}")

for fpath in specific_files:
    if fpath not in processed and os.path.exists(fpath):
        try:
            if process_file(fpath):
                modified += 1
        except Exception as e:
            print(f"  Error: {fpath}: {e}")

print(f"\nModified {modified} files")
