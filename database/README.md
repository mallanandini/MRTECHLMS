# MRTECHLMS — Portable Database Setup & Installation Guide

This guide explains how to install, configure, initialize, and verify the MRTECHLMS MySQL database on any Windows computer (or Linux environment).

---

## 1. Package Contents

The `database/` directory contains all SQL scripts and configuration assets needed to reproduce the MRTECHLMS database:

```
MRTECHLMS/
├── database/
│   ├── schema/                       # Modular DDL files categorized by domain
│   │   ├── 01_core_and_auth.sql      # Users, preferences, organizations, audit logs, migrations
│   │   ├── 02_curriculum_and_learning.sql  # Courses, modules, lessons, enrollments, progress, reviews
│   │   ├── 03_assessments_and_attempts.sql # Assessments, questions, assignments, attempts, submissions
│   │   ├── 04_learning_paths.sql     # Learning paths, sections, items, assignments, progress
│   │   ├── 05_coding_and_playground.sql    # Coding chapters, topics, challenges, playground, jobs
│   │   ├── 06_certifications.sql     # Certificate templates and issued certificates
│   │   ├── 07_organization_and_batches.sql # Institutions, batches, departments, cohorts, groups
│   │   ├── 08_notifications_and_gamification.sql # Notifications, email queue, badges, points
│   │   └── 09_integrations_and_ai.sql# Blogs, SSO, API keys, Webhooks, SCORM, xAPI, AI logs
│   ├── seed/
│   │   ├── 01_reference_data.sql     # Safe system reference data (badges, templates, coding problems)
│   │   └── 02_dev_admin.sql          # Optional development administrator account
│   ├── migrations/                   # Reference schema migrations catalog
│   ├── backups/                      # Backup destination folder (.gitkeep)
│   ├── setup_database.sql            # Master all-in-one portable database setup script
│   ├── verify_database.sql           # Automated verification test script (70 tables, 55 FKs)
│   └── README.md                     # This documentation guide
├── setup-database.bat                # Root-level one-click Windows setup runner
├── .env.example                      # Environment variables template
└── ...
```

---

## 2. Prerequisites & Software Requirements

Before setting up MRTECHLMS on another computer, ensure the following software is installed:

| Component | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Operating System** | Windows 10 (64-bit) | Windows 11 / Windows Server 2022 | Fully supported on Linux/macOS as well |
| **Node.js** | 18.x LTS | 20.x or 22.x LTS | Download from [nodejs.org](https://nodejs.org) |
| **MySQL Server** | 8.0.x | 8.0.36+ / 8.4 LTS | MySQL Community Server (free) |
| **MySQL Workbench** | 8.0.x | Latest Community Edition | Optional GUI client for manual management |

---

## 3. MySQL Server Installation on Windows

If MySQL is not yet installed on the target machine:

1. Download **MySQL Installer for Windows** from the official MySQL website:  
   `https://dev.mysql.com/downloads/installer/`
2. Run the installer and choose **Custom** or **Server only**.
3. Select **MySQL Server 8.0** (or 8.4 LTS) and optionally **MySQL Workbench**.
4. During Configuration:
   - **Config Type:** Development Computer
   - **TCP/IP Port:** `3306` (Open firewall port)
   - **Authentication Method:** Use Strong Password Encryption (`caching_sha2_password` or `mysql_native_password`)
   - **Root Account Password:** Set a secure password and remember it.
   - **Windows Service:** Check *Start the MySQL Server at System Startup* (Service Name: `MySQL80`).
5. Complete installation and verify the service is running in Windows Services (`services.msc`).

---

## 4. Option A: Automated Setup Using `setup-database.bat` (Recommended)

MRTECHLMS provides a root-level Windows batch script that automates the entire setup.

1. Open a terminal (`Command Prompt` or `PowerShell`) inside the `MRTECHLMS` project directory.
2. Run the script:
   ```cmd
   setup-database.bat
   ```
3. The script will:
   - Detect `mysql.exe` in `PATH` or standard Program Files locations.
   - Verify that the MySQL Windows service is active.
   - Prompt for connection details (Host, Port, Username, Password securely).
   - Create the `mrtechlms` database with `utf8mb4` character set.
   - Create all **70 tables**, **55 foreign keys**, and composite indexes.
   - Insert all reference seed data (badges, templates, coding challenges).
   - Run `verify_database.sql` and print a verification report.

---

## 5. Option B: Manual Setup via MySQL Workbench

If `mysql.exe` is not added to your system `PATH`, you can import the database via MySQL Workbench:

1. Launch **MySQL Workbench** and connect to your local MySQL instance (e.g. `Local instance MySQL80`).
2. Open the SQL query tab:
   - Click **File** -> **Open SQL Script...** (or press `Ctrl+Shift+O`).
   - Navigate to the MRTECHLMS directory and select:
     ```
     database\setup_database.sql
     ```
3. Execute the script:
   - Click the **Execute (lightning bolt)** icon on the toolbar.
   - Wait 5–10 seconds for the script to finish.
4. Verify the installation:
   - Click **File** -> **Open SQL Script...**.
   - Select `database\verify_database.sql`.
   - Click **Execute** and review the result grid: all checks should display **`PASS`**.
5. Refresh the **Schemas** navigator on the left to inspect the `mrtechlms` database and its 70 tables.

---

## 6. Option C: Manual Setup via MySQL Command Line Client

If you prefer using the MySQL command line directly:

```cmd
:: 1. Navigate to your MRTECHLMS directory
cd D:\path\to\MRTECHLMS

:: 2. Import setup_database.sql
mysql -h 127.0.0.1 -P 3306 -u root -p < database\setup_database.sql

:: 3. Run verification script
mysql -h 127.0.0.1 -P 3306 -u root -p < database\verify_database.sql
```

---

## 7. Configuring the Application Environment (`.env`)

1. Copy `.env.example` to `.env`:
   ```cmd
   copy .env.example .env
   ```
2. Open `.env` in any text editor and configure your database parameters:
   ```env
   # Server Port
   PORT=3000
   NODE_ENV="development"

   # Database Configuration
   DB_HOST="127.0.0.1"
   DB_PORT="3306"
   DB_USER="root"
   DB_PASSWORD="your_mysql_root_password"
   DB_NAME="mrtechlms"

   # JWT Secret (Generate any long random string)
   JWT_SECRET="mrtechlms_secure_jwt_secret_key_change_in_production_2026"

   # Storage Root (Leave empty to use ./assets at project root)
   STORAGE_LOCAL_ROOT=""
   ```

---

## 8. Starting the Application

1. Install project dependencies:
   ```cmd
   npm install
   ```
2. Provision an Administrator account:
   - **Default Seed Admin:** Pre-seeded for development: `admin@lms.com` / `Admin@123`
   - **Provision Custom Admin:**
     ```cmd
     npm run create-admin
     ```
     Follow the interactive prompts to set your custom administrator email and strong password.
3. Start MRTECHLMS:
   ```cmd
   npm run dev
   ```
4. Access the application in your browser:
   ```
   http://localhost:3000
   ```

---

## 9. Verification & Health Checks

You can run the verification script at any time to audit your database:

```cmd
mysql -u root -p mrtechlms < database\verify_database.sql
```

### Expected Output Summary:
- **Total Tables:** Exactly `70` (`PASS`)
- **Foreign Keys:** Exactly `55` (`PASS`)
- **Schema Migrations:** Exactly `19` (`PASS`)
- **Organizations:** At least `1` (`org-default`) (`PASS`)
- **Certificate Templates:** `4` default templates (`PASS`)
- **Gamification Badges:** `12` system badges (`PASS`)
- **Notification Templates:** `10` notification templates (`PASS`)
- **Coding Chapters:** `5` chapters (`PASS`)
- **Coding Topics:** `41` topics (`PASS`)
- **Coding Challenges:** `38` challenges with starter code and test cases (`PASS`)
- **Admin Users:** At least `1` active admin (`PASS`)

---

## 10. Common MySQL Troubleshooting

### Issue 1: `mysql: command not found`
- **Cause:** MySQL `bin` directory is not in Windows system `PATH`.
- **Fix:** Add MySQL to PATH:
  1. Press `Win + R`, type `sysdm.cpl`, press Enter.
  2. Go to **Advanced** tab -> **Environment Variables**.
  3. Under System Variables, select **Path** -> **Edit** -> **New**.
  4. Paste your MySQL path (e.g., `C:\Program Files\MySQL\MySQL Server 8.0\bin`).
  5. Click OK and restart your terminal.

### Issue 2: `Access denied for user 'root'@'localhost'` (Error 1045)
- **Cause:** Incorrect MySQL root password.
- **Fix:** Verify you are typing the exact password set during MySQL Server installation. If forgotten, reset the password using MySQL Installer (Reconfigure Server) or the `--init-file` password reset method.

### Issue 3: `Can't connect to MySQL server on '127.0.0.1:3306'` (Error 2003)
- **Cause:** The MySQL Windows service is stopped.
- **Fix:** Start the service:
  ```cmd
  net start MySQL80
  ```
  Or open `services.msc`, locate `MySQL80`, right-click, and select **Start**.

### Issue 4: `Port 3306 is already in use`
- **Cause:** Another instance of MySQL, MariaDB, or XAMPP is running on port 3306.
- **Fix:** Either stop the conflicting instance via `services.msc` or configure MRTECHLMS `.env` to connect to the custom port (e.g. `DB_PORT=3307`).

### Issue 5: `Client does not support authentication protocol requested by server`
- **Cause:** Legacy client connecting to MySQL 8.0 with default `caching_sha2_password`.
- **Fix:** MRTECHLMS uses modern `mysql2` which fully supports `caching_sha2_password`. If using an older CLI, alter the user:
  ```sql
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
  FLUSH PRIVILEGES;
  ```
