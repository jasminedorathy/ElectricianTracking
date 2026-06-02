import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

frontend_file = r"c:\Users\user\Caltrackk\Caltrack\frontend\src\ui\pages\TasksPage.jsx"
if os.path.exists(frontend_file):
    with open(frontend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Let's search for handleComplete or complete in html-like render blocks
    lines = content.split('\n')
    for idx, line in enumerate(lines):
        if 'handlecomplete' in line.lower() or 'otp' in line.lower():
            if 'button' in line.lower() or 'onclick' in line.lower():
                print(f"\n--- Occurrence at line {idx+1} ---")
                for j in range(max(0, idx-10), min(len(lines), idx+15)):
                    print(f"{j+1}: {lines[j]}")
else:
    print("TasksPage.jsx not found")
