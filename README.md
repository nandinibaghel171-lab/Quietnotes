# QuietNotes

A simple single-page notes app using HTML, CSS, JavaScript and a lightweight Python Flask backend.

## Features
- Create, edit, delete and pin notes
- Search notes
- Choose from five note colors
- Notes are saved in a local `notes.json` file by the Python backend

## Run locally (Windows)

1. Open this folder in VS Code.
2. Open Terminal → New Terminal.
3. Create and activate a virtual environment:

   ```powershell
   python -m venv venv
   venv\Scripts\activate
   ```

4. Install Flask:

   ```powershell
   pip install Flask
   ```

5. Start the app:

   ```powershell
   python app.py
   ```

6. Open http://127.0.0.1:5000

The `notes.json` file is created automatically the first time you save a note.

## Important assignment note

This version does **not** use a database. It stores notes in a JSON file through the Python backend. It demonstrates request-response flow and file-based persistence, but it does not fully satisfy an instruction that specifically requires notes to be stored in a database.
