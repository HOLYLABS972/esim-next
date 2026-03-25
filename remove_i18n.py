#!/usr/bin/env python3
"""Remove i18n from globalbanka - replace t() calls with Russian strings."""
import json
import re
import os
import sys

# Load Russian translations
with open('/opt/globalbanka/public/locales/ru/common.json', 'r') as f:
    translations = json.load(f)

def get_translation(key):
    """Get Russian translation for a dotted key like 'navbar.logo'"""
    keys = key.split('.')
    value = translations
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return None
    return value if isinstance(value, str) else None

def process_file(filepath):
    """Process a single file to remove i18n."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Remove import lines for useI18n/I18nContext
    content = re.sub(r"import\s*\{\s*useI18n\s*\}\s*from\s*['\"]\.\.?/contexts/I18nContext['\"];\s*\n?", '', content)
    content = re.sub(r"import\s*\{\s*useI18n\s*\}\s*from\s*['\"]\.\.?/\.\.?/contexts/I18nContext['\"];\s*\n?", '', content)
    content = re.sub(r"import\s*\{\s*useI18n\s*\}\s*from\s*['\"]\.\.?/\.\.?/\.\.?/contexts/I18nContext['\"];\s*\n?", '', content)
    content = re.sub(r"import\s*\{\s*useI18n\s*\}\s*from\s*['\"][^'\"]*I18nContext['\"];\s*\n?", '', content)
    
    # Remove `const { t } = useI18n();` and variants
    content = re.sub(r"\s*const\s*\{\s*t\s*,\s*locale\s*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    content = re.sub(r"\s*const\s*\{\s*t\s*,\s*locale\s*,\s*changeLanguage\s*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    content = re.sub(r"\s*const\s*\{\s*t\s*,\s*locale\s*,\s*translations\s*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    content = re.sub(r"\s*const\s*\{\s*t\s*,\s*locale\s*,\s*translations\s*,\s*changeLanguage\s*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    content = re.sub(r"\s*const\s*\{\s*locale\s*,\s*t\s*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    content = re.sub(r"\s*const\s*\{\s*t\s*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    content = re.sub(r"\s*const\s*\{[^}]*\}\s*=\s*useI18n\(\);\s*\n?", '\n', content)
    
    # Replace t('key', 'fallback', {vars}) patterns - with variables, keep as template literal
    # First handle t('key', 'fallback') - simple case
    def replace_t_call(match):
        full = match.group(0)
        key = match.group(1)
        fallback = match.group(2) if match.group(2) else None
        
        russian = get_translation(key)
        if russian:
            # Escape quotes for JSX
            return json.dumps(russian, ensure_ascii=False)[1:-1]  # strip outer quotes
        elif fallback:
            return fallback
        else:
            return key
    
    # t('key', 'fallback')  or t('key', "fallback")
    # Handle t() with template literals and variables - complex patterns
    # Simple: t('key', 'fallback')
    content = re.sub(
        r"""t\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*\)""",
        replace_t_call,
        content
    )
    
    # t('key') - no fallback
    def replace_t_simple(match):
        key = match.group(1)
        russian = get_translation(key)
        if russian:
            return json.dumps(russian, ensure_ascii=False)[1:-1]
        return key
    
    content = re.sub(
        r"""t\(\s*['"]([^'"]+)['"]\s*\)""",
        replace_t_simple,
        content
    )
    
    # Handle remaining t() calls with variables like t('key', 'fallback', { var: val })
    # These need to become template literals with variable interpolation
    # Pattern: t('key', 'fallback', { key: value })
    def replace_t_with_vars(match):
        full = match.group(0)
        key = match.group(1)
        fallback = match.group(2)
        vars_str = match.group(3)
        
        russian = get_translation(key)
        text = russian if russian else fallback
        if not text:
            text = key
        
        # Replace {{var}} with ${var_expression} - but we need to parse vars
        # For now, just return the Russian text with {{}} placeholders kept
        return text
    
    content = re.sub(
        r"""t\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]\s*,\s*(\{[^}]*\})\s*\)""",
        replace_t_with_vars,
        content
    )
    
    # Replace locale references with 'ru' 
    # But be careful not to break things - only simple locale usages
    # content = re.sub(r'\blocale\b', "'ru'", content)  # too aggressive
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  Modified: {filepath}")
        return True
    return False

# Find all relevant files
base = '/opt/globalbanka'
modified = 0
for root, dirs, files in os.walk(base):
    # Skip node_modules and .next
    dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', '.git', 'locales')]
    for fname in files:
        if fname.endswith(('.jsx', '.js', '.tsx', '.ts')):
            fpath = os.path.join(root, fname)
            # Skip API routes
            if '/api/' in fpath:
                continue
            try:
                with open(fpath, 'r') as f:
                    content = f.read()
                if 'useI18n' in content or "t('" in content or 't("' in content:
                    if process_file(fpath):
                        modified += 1
            except Exception as e:
                print(f"  Error: {fpath}: {e}")

print(f"\nModified {modified} files")
