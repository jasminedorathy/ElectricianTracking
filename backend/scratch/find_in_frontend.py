import os

frontend_file = r"c:\Users\user\Caltrackk\Caltrack\frontend\src\ui\pages\TasksPage.jsx"
if os.path.exists(frontend_file):
    with open(frontend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Search for action keywords
    lines = content.split('\n')
    for idx, line in enumerate(lines):
        if 'start' in line.lower() or 'photo' in line.lower() or 'complete' in line.lower():
            if 'action' in line.lower() or 'api' in line.lower() or 'button' in line.lower():
                print(f"Line {idx+1}: {line.strip()[:100]}")
else:
    print("TasksPage.jsx not found at path")
