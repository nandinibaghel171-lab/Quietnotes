from flask import Flask, jsonify, request, send_from_directory
from pathlib import Path
from datetime import datetime, timezone
import json
import os

app = Flask(__name__, static_folder="static")
DATA_FILE = Path(__file__).with_name("notes.json")
ALLOWED_COLORS = {"lavender", "mint", "peach", "blue", "cream"}

def read_notes():
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

def write_notes(notes):
    DATA_FILE.write_text(
        json.dumps(notes, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

@app.get("/")
def home():
    return send_from_directory("static", "index.html")

@app.get("/api/notes")
def list_notes():
    notes = read_notes()
    notes.sort(key=lambda note: (not note.get("pinned", False), note.get("updated_at", "")), reverse=False)
    return jsonify(notes)

@app.post("/api/notes")
def create_note():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    color = data.get("color", "lavender")

    if not title and not content:
        return jsonify({"error": "Please write something before saving."}), 400
    if not title:
        title = "Untitled note"
    if color not in ALLOWED_COLORS:
        color = "lavender"

    notes = read_notes()
    new_id = max((note.get("id", 0) for note in notes), default=0) + 1
    now = datetime.now(timezone.utc).isoformat()
    note = {
        "id": new_id,
        "title": title[:120],
        "content": content,
        "color": color,
        "pinned": bool(data.get("pinned", False)),
        "created_at": now,
        "updated_at": now
    }
    notes.append(note)
    write_notes(notes)
    return jsonify(note), 201

@app.put("/api/notes/<int:note_id>")
def edit_note(note_id):
    data = request.get_json(silent=True) or {}
    notes = read_notes()
    note = next((item for item in notes if item.get("id") == note_id), None)
    if note is None:
        return jsonify({"error": "Note not found."}), 404

    title = (data.get("title") or "").strip() or "Untitled note"
    color = data.get("color", "lavender")
    if color not in ALLOWED_COLORS:
        color = "lavender"

    note.update({
        "title": title[:120],
        "content": (data.get("content") or "").strip(),
        "color": color,
        "pinned": bool(data.get("pinned", False)),
        "updated_at": datetime.now(timezone.utc).isoformat()
    })
    write_notes(notes)
    return jsonify(note)

@app.delete("/api/notes/<int:note_id>")
def remove_note(note_id):
    notes = read_notes()
    remaining = [note for note in notes if note.get("id") != note_id]
    if len(remaining) == len(notes):
        return jsonify({"error": "Note not found."}), 404
    write_notes(remaining)
    return jsonify({"message": "Note deleted."})

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=True)
