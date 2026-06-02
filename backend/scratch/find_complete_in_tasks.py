import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

frontend_file = r"c:\Users\user\Caltrackk\Caltrack\frontend\src\ui\pages\TasksPage.jsx"
if os.path.exists(frontend_file):
    with open(frontend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Let's search for handleComplete or where complete is used in render
    lines = content.split('\n')
    for idx, line in enumerate(lines):
        if 'afterphoto' in line.lower() or 'handlecomplete' in line.lower() or 'complete' in line.lower():
            if 'button' in line.lower() or 'input' in line.lower() or 'div' in line.lower() or 'onclick' in line.lower():
                print(f"Line {idx+1}: {line.strip()[:120]}")
else:
    print("TasksPage.jsx not found")
