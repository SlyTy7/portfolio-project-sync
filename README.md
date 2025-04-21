<!-- portfolio-meta display_name: Portfolio Project Sync -->
# 🔄 Portfolio Project Sync

Automatically sync your personal GitHub repositories to Firebase to power your developer portfolio. No more copy-pasting project info — this GitHub Action does it for you.

## 🚀 What It Does

- Fetches your public GitHub repositories  
- Filters those tagged with the `portfolio-project` topic  
- Extracts useful metadata:
  - Repository name
  - GitHub URL
  - Live demo link (from repo `homepage`)
  - Description
  - Topics
  - Last updated timestamp  
- Syncs that data to your Firebase Firestore  
- Runs daily (or manually)


## 🛠 Setup

### 1. Clone or Fork This Repo

```bash
git clone https://github.com/your-username/portfolio-project-sync.git
```

### 2. Add GitHub Secrets

In your repo, go to:

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Create the following secrets:

| Name                       | Value                                                       |
|----------------------------|-------------------------------------------------------------|
| `PERSONAL_GITHUB_TOKEN`    | A fine-grained personal access token with `repo` scope      |
| `FIREBASE_SERVICE_ACCOUNT` | The full JSON contents of your Firebase service account key |

> ⚠️ GitHub does **not** allow secrets starting with `GITHUB_` — use `PERSONAL_GITHUB_TOKEN`.

### 3. Required GitHub Repo Setup

- Add a **topic** called `portfolio-project` to each GitHub repo you want to appear in your portfolio.  
  - This is how the script knows which repos to sync.

---


## 🧪 Run It Manually

You can trigger the sync from the **Actions** tab on GitHub:

- Click "Sync GitHub Projects to Firebase"
- Click "Run workflow"


## 🔄 Auto Sync Schedule

The included GitHub Action runs the sync script every day at **3AM UTC**:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'    # daily at 3AM UTC
  workflow_dispatch:       # also manually triggerable
```


## 📁 Firestore Structure

Projects are stored in the `projects` collection, using each repo’s name as the document ID:

```json
{
  "name": "cool-project",
  "githubUrl": "https://github.com/username/cool-project",
  "liveUrl": "https://cool-project.vercel.app",
  "description": "A cool app that does stuff.",
  "topics": ["react", "vite", "firebase"],
  "updatedAt": "2025-04-18T20:01:44Z"
}
```


## 🧰 Tech Stack

- Node.js  
- Firebase Admin SDK  
- GitHub Actions  
- GitHub REST API  


## 📄 License

MIT © [Tyler West](https://github.com/slyty7)

