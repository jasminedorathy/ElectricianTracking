import subprocess

def find_kpi_code():
    try:
        # Get DashboardPage.jsx from HEAD
        res = subprocess.run(
            ["git", "show", "HEAD:frontend/src/ui/pages/DashboardPage.jsx"],
            cwd="c:\\Users\\user\\Caltrackk\\Caltrack",
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        content = res.stdout
        
        # Check if content has anything related to KpiDiagram
        lines = content.splitlines()
        found = False
        for idx, line in enumerate(lines):
            if "KpiDiagram" in line or "ThreeDKpiCard" in line or "KpiDiagramSide" in line or "pulse" in line or "Total personnel" in line:
                print(f"Line {idx+1}: {line}")
                found = True
        
        # Let's save the HEAD file to a temporary location so we can read it easily
        with open("c:\\Users\\user\\Caltrackk\\Caltrack\\frontend\\head_DashboardPage.jsx", "w", encoding="utf-8") as f:
            f.write(content)
        print("HEAD file written to frontend/head_DashboardPage.jsx")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    find_kpi_code()
