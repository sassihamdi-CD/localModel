# SecureDoc-RAG

A fully local, privacy-preserving document intelligence system. Upload PDFs, Word documents, or text files and chat with them using AI — everything runs on your machine with no external API keys required.

---

## What It Does

- **Secure document vault** — upload and encrypt internal documents (PDF, DOCX, TXT)
- **AI-powered chat** — ask questions about your documents, get answers with source context
- **Role-based access control** — admin, employee, auditor roles with per-document permissions
- **Full audit trail** — every login, upload, and query is logged
- **100% local** — AI runs via Ollama on your machine, nothing leaves your network

---

## Requirements

Before you start, make sure you have these installed:

| Tool | Version | Download |
|---|---|---|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Ollama | Latest | https://ollama.com |

**Check Docker is installed:**
```bash
docker --version
docker compose version
```
You need Docker Compose v2 or later (`docker compose`, not `docker-compose`).

---

## Step 1 — Install Ollama and Pull the AI Model

Ollama runs the local AI. Install it first, then download the model.

**Install Ollama:**
- **macOS / Windows:** Download from https://ollama.com and run the installer
- **Linux:**
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

**Pull the AI model** (downloads ~2 GB, one time only):
```bash
ollama pull qwen2.5:3b
```

**Verify Ollama is running and the model is ready:**
```bash
ollama list
```
You should see `qwen2.5:3b` in the list.

> Ollama must stay running in the background while you use the app.
> On macOS and Windows it runs automatically after install.
> On Linux, start it with:
> ```bash
> ollama serve
> ```

---

## Step 2 — Clone the Repository

```bash
git clone <your-repo-url> securedoc-rag
cd securedoc-rag
```

---

## Step 3 — Verify the `.env` File Exists

The `.env` file is included in the project with all defaults pre-configured. Just verify it is there:

```bash
ls .env
```

You should see `.env` listed. No edits needed for a standard setup.

> **Only if port 3000 is already in use on your machine:**
> Open `.env` in any text editor and find these two commented lines near the bottom:
> ```
> # FRONTEND_PORT=3003
> # CORS_ORIGINS=http://localhost:3003,http://127.0.0.1:3003,http://[::1]:3003
> ```
> Remove the `#` from both lines, then add `#` to the existing `CORS_ORIGINS=http://localhost:3000,...` line just below them.
> After this change, open the app on `http://localhost:3003` instead of `http://localhost:3000`.

---

## Step 4 — Start the Application

From inside the project folder, run:

```bash
docker compose up --build -d
```

This will:
1. Build the backend and frontend Docker images
2. Start MySQL, Redis, ChromaDB, the API, and the frontend
3. Automatically run database migrations
4. Automatically create the admin user

**The first build takes 3–5 minutes.** Subsequent starts are instant.

**Watch the backend finish starting up:**
```bash
docker compose logs -f backend
```

Wait until you see this line:
```
✅ SecureDoc-RAG is ready!
```

Press `Ctrl+C` to stop following logs — the app keeps running in the background.

**Check all services are healthy:**
```bash
docker compose ps
```

Expected output:
```
NAME                 STATUS
securedoc_backend    Up (healthy)
securedoc_chroma     Up
securedoc_frontend   Up
securedoc_mysql      Up (healthy)
securedoc_redis      Up (healthy)
```

---

## Step 5 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

**Login with the default admin account:**

| Field | Value |
|---|---|
| Email | `admin@test.com` |
| Password | `Password123!` |

---

## Using the App

### Upload a Document

1. Go to **Secure Vault** in the left sidebar
2. Click **Ingest Data**
3. Enter a name for the document (e.g. `Q4 Report`)
4. Select a security clearance level (`Internal`, `Confidential`, etc.)
5. Click **Browse** and pick a PDF, DOCX, or TXT file (max 50 MB)
6. Click **Secure Upload**

The document is encrypted and indexed. Allow 10–30 seconds depending on file size.

### Chat with Your Documents

1. Go to **Secure Terminal** in the left sidebar
2. Type a question in the input box and press Enter
3. The AI answers based only on the content of your uploaded documents

**Example questions:**
- *"Summarize the main points of this document"*
- *"What does the document say about [topic]?"*
- *"What are the key steps in the incident response procedure?"*

> The AI only answers from uploaded document content. If you ask about something not in any document, it will say it does not know — this is expected and correct.

---

## Stopping the App

```bash
docker compose down
```

All your data (documents, users, chat history) is saved in Docker volumes and persists between restarts.

**To start again later:**
```bash
docker compose up -d
```

---

## Troubleshooting

### Backend keeps restarting

Check the logs for errors:
```bash
docker logs securedoc_backend
```

**Most common cause — Ollama is not running.**
Make sure Ollama is started before or after the app:

```bash
# macOS / Windows: open the Ollama desktop app
# Linux:
ollama serve
```

Then restart just the backend:
```bash
docker compose restart backend
```

---

### "Invalid email or password" on login

The admin password is reset automatically every time the backend starts. Always use:

- Email: `admin@test.com`
- Password: `Password123!`

---

### Port 3000 already in use

If startup fails with `Bind for 0.0.0.0:3000 failed: port is already allocated`, find a free port:

```bash
# macOS / Linux:
for port in 3000 3001 3002 3003 3004; do
  lsof -ti:$port >/dev/null 2>&1 && echo "$port: BUSY" || echo "$port: FREE"
done
```

Then open `.env`, uncomment the `FRONTEND_PORT` and the matching `CORS_ORIGINS` lines, and set them to a free port number. Restart with:

```bash
docker compose down
docker compose up -d
```

---

### Chat returns no results or AI errors

Check that the model is downloaded:
```bash
ollama list
```

If `qwen2.5:3b` is missing:
```bash
ollama pull qwen2.5:3b
```

Then restart the backend:
```bash
docker compose restart backend
```

---

### Full reset — wipe everything and start fresh

> **Warning:** This permanently deletes all uploaded documents, users, and chat history.

```bash
docker compose down -v
docker compose up --build -d
```

---

## Architecture

```
Your Browser
  │
  ├── Frontend  (Next.js)     → http://localhost:3000
  │
  └── Backend API (FastAPI)   → http://localhost:8000
        ├── MySQL             → users, documents, audit logs
        ├── Redis             → rate limiting, caching
        ├── ChromaDB          → vector search for RAG
        └── Ollama            → local AI model (runs on your machine)
```

All services run inside Docker except Ollama, which runs natively on your machine and is accessed by the backend container via `host.docker.internal:11434`.

---

## Default Credentials

| Service | Credential |
|---|---|
| App login | `admin@test.com` / `Password123!` |
| MySQL root | `securedoc_root_p@ssw0rd!` |
| MySQL app user | `rag_user` / `rag_p@ssw0rd_2026!` |
| Redis | `redis_p@ssw0rd_secure_2026!` |

---

## Quick Reference — All Commands

```bash
# First time setup
docker compose up --build -d

# Start (after first build)
docker compose up -d

# Stop
docker compose down

# View all logs live
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Check status of all services
docker compose ps

# Restart a single service
docker compose restart backend

# Rebuild after any code changes
docker compose up --build -d

# Full reset — deletes all data
docker compose down -v && docker compose up --build -d
```
