import os

files_to_fix = [
    'src/app/(inbox)/page.tsx',
    'src/app/(inbox)/launch/page.tsx',
    'src/app/(inbox)/ai-summary/page.tsx'
]

for file in files_to_fix:
    with open(file, 'r') as f:
        content = f.read()
    
    # Replace getUser with getSession
    content = content.replace(
        'const { data: { user }, error',
        'const { data: { session }, error'
    )
    content = content.replace(
        'supabase.auth.getUser()',
        'supabase.auth.getSession()'
    )
    # The variables might be named user, so let's change `!user` to `!session`
    content = content.replace('!user', '!session')
    
    with open(file, 'w') as f:
        f.write(content)
    print(f"Fixed {file}")
