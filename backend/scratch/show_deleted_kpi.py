import subprocess

def get_deleted_lines():
    try:
        # Run git diff
        res = subprocess.run(
            ["git", "diff", "src/ui/pages/DashboardPage.jsx"],
            cwd="c:\\Users\\user\\Caltrackk\\Caltrack\\frontend",
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        diff_output = res.stdout
        
        # Filter for deleted lines (starting with '-')
        # But let's write the whole diff to a file first to be safe
        with open("c:\\Users\\user\\Caltrackk\\Caltrack\\frontend\\diff_full.txt", "w", encoding="utf-8") as f:
            f.write(diff_output)
        print("Diff successfully written to frontend/diff_full.txt")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    get_deleted_lines()
