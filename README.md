# SecureDoc-RAG

A fully local, privacy-preserving document intelligence system. Upload PDFs, Word documents, or text files and ask questions about them using AI. Everything runs on your machine — no internet, no API keys, no data leaving your network.

---

## Requirements

| Tool | Version | Download |
|---|---|---|
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |
| Ollama | Latest | https://ollama.com |

> **Windows users:** Make sure Docker Desktop is set to use **WSL 2** as the backend (this is the default). You can verify in Docker Desktop → Settings → General → "Use the WSL 2 based engine".

> **NVIDIA GPU users (Windows):** Ollama automatically detects and uses your GPU. No extra configuration needed — just install the latest NVIDIA drivers before installing Ollama.

---

## Step 1 — Install Ollama and Pull the Model

**Install Ollama:**
- **Windows / macOS:** Download from https://ollama.com and run the installer
- **Linux:**
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```

**Pull the required model** (downloads ~2 GB, one time only):
```bash
ollama pull qwen2.5:3b
```

**Verify the model is ready:**
```bash
ollama list
```
You should see `qwen2.5:3b` in the list.

> Ollama must be running in the background while you use the app.
> On Windows and macOS it starts automatically after install.
> On Linux, start it with: `ollama serve`

---

## Step 2 — Clone the Repository

```bash
git clone https://github.com/sassihamdi-CD/localModel.git securedoc-rag
cd securedoc-rag
```

---

## Step 3 — Start the Application

```bash
docker compose up --build -d
```

This will:
1. Build the backend and frontend Docker images
2. Start MySQL, Redis, ChromaDB, the API, and the frontend
3. Automatically run database migrations
4. Automatically create all user accounts

**The first build takes 3–5 minutes.** Subsequent starts are instant.

**Watch the backend finish starting up:**
```bash
docker compose logs -f backend
```

Wait until you see:
```
SecureDoc-RAG is ready!
```

Press `Ctrl+C` to stop following logs — the app keeps running.

**Check all services are running:**
```bash
docker compose ps
```

---

## Step 4 — Open the App

Go to: **http://localhost:3000**

---

## Default Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@test.com` | `Admin123!` |
| **Employee** | `employee@test.com` | `Employee123!` |
| **Doc Manager** | `docmgr@test.com` | `DocMgr123!` |
| **Security Officer** | `security@test.com` | `Security123!` |

---

## What Each Role Can Do

| Feature | Admin | Doc Manager | Employee | Security Officer |
|---|---|---|---|---|
| Chat with AI | ✅ | ✅ | ✅ | ❌ |
| View documents | ✅ | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ❌ | ❌ |
| Delete documents | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ | ✅ |
| Export logs CSV | ✅ | ❌ | ❌ | ✅ |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Document ACL | ✅ | ❌ | ❌ | ❌ |

---

## Using the App

### Upload a Document (Admin or Doc Manager)

1. Go to **Documents** in the top nav
2. Fill in the title, select a classification level, choose a file
3. Click **Secure Upload**

**Classification levels:**
- **Public** — visible to all users, accessible in chat by everyone
- **Internal** — visible to all users, accessible in chat by everyone (default for most docs)
- **Confidential** — only owner + users/roles explicitly granted access via Admin → Document Access
- **Restricted** — same as Confidential but highest sensitivity level

### Chat with Your Documents

1. Go to **Chat** in the top nav
2. Type a question and press Enter
3. The AI answers based only on the content of uploaded documents

### Grant Access to Confidential Documents (Admin only)

1. Go to **Admin** → **Document Access** tab
2. Click the document on the left
3. Grant access to a specific role or user on the right

---

## Stopping the App

```bash
docker compose down
```

All data (documents, users, chat history) is saved in Docker volumes and persists between restarts.

**Start again later:**
```bash
docker compose up -d
```

---

## Troubleshooting

### Port 3000 is already in use

Open `.env` and change:
```
FRONTEND_PORT=3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000
```
to a free port, for example 3001:
```
FRONTEND_PORT=3001
CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001,http://[::1]:3001
```
Then restart:
```bash
docker compose down
docker compose up -d
```

### Chat returns errors or "Ollama not reachable"

Make sure Ollama is running on your machine (not inside Docker — it runs natively):

```bash
# Check if model is downloaded:
ollama list

# If qwen2.5:3b is missing:
ollama pull qwen2.5:3b
```

On Windows, open the Ollama app from the system tray to make sure it is running.

### Backend keeps restarting

```bash
docker compose logs backend
```

Most common cause: database not ready yet. Wait 30 seconds and run `docker compose up -d` again.

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
  ├── Frontend  (Next.js 14)    → http://localhost:3000
  │
  └── Backend API (FastAPI)     → http://localhost:8000
        ├── MySQL               → users, documents, audit logs (Docker)
        ├── Redis               → rate limiting (Docker)
        ├── ChromaDB            → vector embeddings (Docker)
        └── Ollama              → local AI model (runs natively on your machine)
```

All services run inside Docker except Ollama, which runs natively on your machine and is accessed by the backend at `host.docker.internal:11434`.

---

## Quick Reference

```bash
# First time setup
docker compose up --build -d

# Start (after first build)
docker compose up -d

# Stop
docker compose down

# View live logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# Rebuild after code changes
docker compose up --build -d

# Full reset (deletes all data)
docker compose down -v && docker compose up --build -d
```
