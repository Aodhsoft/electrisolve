# ElectriSolve — GitHub + Vercel Setup Guide
## One-time setup, then everything auto-deploys forever

---

## What this does

Once set up, every time Claude makes changes to the website, you just run
**one command** on your computer and the site goes live automatically.

No more dragging zip files. No more Vercel dashboard. Just:
```
git add . && git commit -m "update" && git push
```
That's it. The site updates in about 30 seconds.

---

## STEP 1 — Install Git (skip if already installed)

1. Go to **https://git-scm.com/downloads**
2. Download for your OS (Windows / Mac / Linux)
3. Install with all default options
4. Open a terminal / command prompt and type:
   ```
   git --version
   ```
   If you see something like `git version 2.x.x` you're good.

**On Mac:** Git may already be installed. Open Terminal (search "Terminal" in Spotlight) and type `git --version`.

---

## STEP 2 — Create a GitHub account (skip if you have one)

1. Go to **https://github.com**
2. Click **Sign up**
3. Use your email, create a username and password
4. Verify your email

---

## STEP 3 — Create a new GitHub repository

1. Go to **https://github.com/new**
2. Repository name: `electrisolve`
3. Set to **Private** (so your code isn't public)
4. **Do NOT** check "Add a README file" or any other options
5. Click **Create repository**
6. Leave this page open — you'll need the URL in Step 5

---

## STEP 4 — Get your Vercel credentials (3 values you need)

You need 3 secret values from Vercel. Here's exactly where to find each one.

### Value 1: VERCEL_TOKEN
1. Go to **https://vercel.com/account/tokens**
2. Click **Create Token**
3. Name it `github-deploy`
4. Scope: **Full Account**
5. No expiration
6. Click **Create**
7. **Copy the token immediately** — Vercel only shows it once
8. Paste it somewhere safe (Notes app, etc.)

### Value 2: VERCEL_ORG_ID
Your Org ID is: **`team_EDrgGPfe8l51lLlThlJ1IyiM`**
(Already filled in — copy this exactly)

### Value 3: VERCEL_PROJECT_ID
Your Project ID is: **`prj_f2RL5AKUa5soCKGIPENNkuDqTnh1`**
(Already filled in — copy this exactly)

---

## STEP 5 — Add the 3 secrets to GitHub

1. Go to your new GitHub repo
2. Click **Settings** (top menu bar of the repo)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** and add each one:

| Name | Value |
|------|-------|
| `VERCEL_TOKEN` | (the token you copied in Step 4) |
| `VERCEL_ORG_ID` | `team_EDrgGPfe8l51lLlThlJ1IyiM` |
| `VERCEL_PROJECT_ID` | `prj_f2RL5AKUa5soCKGIPENNkuDqTnh1` |

Add them one at a time — click **New repository secret**, fill in the Name and Value, click **Add secret**.

---

## STEP 6 — Upload the project files (one time only)

Open a terminal / command prompt on your computer.

### On Windows:
Press `Windows key + R`, type `cmd`, press Enter.

### On Mac:
Press `Cmd + Space`, type `Terminal`, press Enter.

Now run these commands one at a time. Copy and paste each line:

```bash
cd Desktop
```
*(or wherever you want the project folder — this puts it on your Desktop)*

```bash
git clone https://github.com/YOUR_USERNAME/electrisolve.git
```
*(Replace YOUR_USERNAME with your actual GitHub username)*

```bash
cd electrisolve
```

Now **copy all the files from the electrisolve-github folder into this folder.**
The files you need to copy in are:
- `index.html`
- `jobs.html`
- `post-job.html`
- `estimate.html`
- `contractor.html`
- `style.css`
- `vercel.json`
- The `.github` folder (with the `workflows` subfolder inside)

Then run:

```bash
git add .
git commit -m "initial upload"
git push
```

GitHub will ask for your username and password the first time.
**Note:** For the password, use a **Personal Access Token** not your account password.
Get one at: https://github.com/settings/tokens → Generate new token (classic) → check `repo` → Generate.

---

## STEP 7 — Connect Vercel to GitHub (one time only)

1. Go to **https://vercel.com/dashboard**
2. Find your **electrisolve** project and click it
3. Click **Settings** → **Git**
4. Click **Connect Git Repository**
5. Select **GitHub** and authorize Vercel
6. Find and select your `electrisolve` repository
7. Click **Connect**

Done. Vercel now watches your GitHub repo.

---

## STEP 8 — Test it

After pushing in Step 6, go to:
**https://github.com/YOUR_USERNAME/electrisolve/actions**

You should see a workflow running (yellow dot = in progress, green = done, red = error).

Once it's green, your site is live at **https://electrisolve.vercel.app**

---

## Every future update — just 3 commands

Whenever Claude gives you updated files, copy them into your `electrisolve` folder, then open your terminal and run:

```bash
cd Desktop/electrisolve
git add .
git commit -m "update"
git push
```

The site auto-deploys in about 30 seconds. You can watch it at:
https://github.com/YOUR_USERNAME/electrisolve/actions

---

## Troubleshooting

**"Permission denied" when pushing**
→ Make sure you're using a Personal Access Token as your password, not your GitHub account password. Get one at https://github.com/settings/tokens

**Workflow shows red X (failed)**
→ Go to the Actions tab, click the failed run, and look for the error message. Most common cause is a wrong secret value — double-check VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID in Settings → Secrets.

**"Repository not found" error**
→ Make sure you typed your GitHub username correctly in the `git clone` command.

**Site not updating after push**
→ Check the Actions tab to confirm the workflow ran. If it's green but site hasn't changed, wait 60 seconds and hard-refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac).

**Need to start over**
→ Delete the `electrisolve` folder on your Desktop, re-run the `git clone` command from Step 6.

---

## Quick reference card

| Task | Command |
|------|---------|
| Go to project folder | `cd Desktop/electrisolve` |
| Push an update | `git add . && git commit -m "update" && git push` |
| Check deployment status | https://github.com/YOUR_USERNAME/electrisolve/actions |
| View live site | https://electrisolve.vercel.app |

---

*Vercel Org ID: `team_EDrgGPfe8l51lLlThlJ1IyiM`*
*Vercel Project ID: `prj_f2RL5AKUa5soCKGIPENNkuDqTnh1`*
