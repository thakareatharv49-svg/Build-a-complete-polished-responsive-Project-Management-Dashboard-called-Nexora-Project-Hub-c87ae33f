from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_browser_entry_and_local_assets_exist():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert (ROOT / "style.css").is_file()
    assert (ROOT / "app.js").is_file()
    assert 'src="app.js"' in html
    assert 'href="style.css"' in html


def test_task_manager_implements_real_crud_and_persistence():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    for behavior in ("localStorage.getItem", "localStorage.setItem", "function render",
                     "function showForm", 'data-action="edit"', 'data-action="delete"',
                     'data-action="toggle"', "tasks.push", "tasks.filter"):
        assert behavior in js


def test_task_manager_starts_without_demo_records():
    js = (ROOT / "app.js").read_text(encoding="utf-8")
    assert 'localStorage.getItem(STORAGE_KEY) || "[]"' in js
    assert "const sampleTasks" not in js
    assert "demoTasks" not in js
