import os
import sys

# Reconfigure stdout to use utf-8 to avoid encoding errors with emojis
sys.stdout.reconfigure(encoding='utf-8')

frontend_file = r"c:\Users\user\Caltrackk\Caltrack\frontend\src\ui\pages\TasksPage.jsx"
if os.path.exists(frontend_file):
    with open(frontend_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    start_line = 2050
    end_line = 2400
    for idx in range(start_line, min(end_line, len(lines))):
        print(f"{idx+1}: {lines[idx]}", end="")
else:
    print("TasksPage.jsx not found")
