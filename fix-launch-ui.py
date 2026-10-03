import re

with open('src/components/LaunchClient.tsx', 'r') as f:
    content = f.read()

# 1 & 2: Header title and icon
# Old:
#             <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-none flex items-center gap-2">
#               <Mail className="w-5 h-5 text-purple-600" />
#               Launch Queue
#             </h1>
# New:
#             <h1 className="truncate font-semibold text-gray-900 dark:text-gray-100 leading-none text-xl">Launch Queue</h1>

content = re.sub(
    r'<h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-none flex items-center gap-2">\s*<Mail[^>]*>\s*Launch Queue\s*</h1>',
    '<h1 className="truncate font-semibold text-gray-900 dark:text-gray-100 leading-none text-xl">Launch Queue</h1>',
    content
)

# 3. Colors: Replace purple with blue
content = content.replace('purple-600', 'blue-600')
content = content.replace('purple-700', 'blue-700')
content = content.replace('purple-50', 'blue-50')
content = content.replace('purple-500', 'blue-500')
content = content.replace('bg-purple-900/10', 'bg-blue-900/10')
content = content.replace('bg-purple-900/20', 'bg-blue-900/20')
content = content.replace('bg-purple-900/30', 'bg-blue-900/30')
content = content.replace('text-purple-400', 'text-blue-400')
content = content.replace('shadow-purple-600/20', 'shadow-blue-600/20')
content = content.replace('ring-purple-500', 'ring-blue-500')
content = content.replace('border-purple-500', 'border-blue-500')
content = content.replace('border-purple-300', 'border-blue-300')
content = content.replace('border-purple-600', 'border-blue-600')

# 4. Corner radius on the right sidebar
# Old: className="flex flex-col h-full bg-white dark:bg-[#161616] z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 w-[50%]"
# New: Add rounded-tl-2xl
content = content.replace(
    'className="flex flex-col h-full bg-white dark:bg-[#161616] z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 w-[50%]"',
    'className="flex flex-col h-full bg-white dark:bg-[#161616] z-10 relative overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 w-[50%] rounded-tl-2xl border-l border-gray-200 dark:border-white/10"'
)

with open('src/components/LaunchClient.tsx', 'w') as f:
    f.write(content)
print("Done!")
