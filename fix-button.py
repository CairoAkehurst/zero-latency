import re

with open('src/components/LaunchClient.tsx', 'r') as f:
    content = f.read()

# Find the button block
button_match = re.search(r'<div className="pb-4 mb-2">.*?</div>\n\s*\{isEditingDraft \?', content, flags=re.DOTALL)

if button_match:
    print("Found button block, replacing...")
    # Extract the button div
    button_div_match = re.search(r'(<div className="pb-4 mb-2">.*?</div>)', button_match.group(0), flags=re.DOTALL)
    button_div = button_div_match.group(1)
    
    # Remove from top
    content = content.replace(button_match.group(0), "{isEditingDraft ?")
    
    # Create the sticky bottom button
    sticky_button = button_div.replace('pb-4 mb-2', 'p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1c1c1c] sticky bottom-0 mt-auto')
    
    # Insert it at the end of the draft view
    # The structure:
    # {isEditingDraft ? (
    #   <textarea ... />
    # ) : (
    #   <div ...>{activeTask.draft}</div>
    # )}
    # <--- Insert here
    # </div>
    # )}
    
    insert_target = "                  )}\n                </div>\n              )}\n            </div>"
    replacement = "                  )}\n" + sticky_button + "\n                </div>\n              )}\n            </div>"
    
    if insert_target in content:
        content = content.replace(insert_target, replacement)
        with open('src/components/LaunchClient.tsx', 'w') as f:
            f.write(content)
        print("Successfully moved button to bottom.")
    else:
        print("Could not find insert target.")

else:
    print("Could not find top button block.")

