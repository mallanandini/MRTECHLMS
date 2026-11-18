@echo off
setlocal enabledelayedexpansion

title MRTECHLMS - Portable Database Setup

echo =====================================================================
echo                MRTECHLMS PORTABLE DATABASE SETUP
echo =====================================================================
echo This script initializes the MRTECHLMS MySQL database on this computer.
echo It will create the 'mrtechlms' database, all 70 tables, foreign keys,
echo composite indexes, and safe initial reference data.
echo =====================================================================
echo.

:: ---------------------------------------------------------------------
:: 1. Detect mysql.exe
:: ---------------------------------------------------------------------
echo [*] Checking MySQL installation...
set "MYSQL_CMD="

where mysql.exe >nul 2>nul
if %errorlevel% equ 0 (
    set "MYSQL_CMD=mysql.exe"
    echo [OK] Found mysql.exe in system PATH.
) else (
    echo [!] mysql.exe is not in system PATH. Checking standard installation paths...
    for %%P in (
        "%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe"
        "%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysql.exe"
        "%ProgramFiles%\MySQL\MySQL Server 9.0\bin\mysql.exe"
        "%ProgramFiles%\MySQL\MySQL Server 9.1\bin\mysql.exe"
        "%ProgramFiles%\MySQL\MySQL Server 9.2\bin\mysql.exe"
        "%ProgramFiles(x86)%\MySQL\MySQL Server 8.0\bin\mysql.exe"
        "C:\xampp\mysql\bin\mysql.exe"
        "C:\laragon\bin\mysql\current\bin\mysql.exe"
    ) do (
        if exist "%%~P" (
            set "MYSQL_CMD=%%~P"
            echo [OK] Found MySQL at: %%~P
            goto :found_mysql
        )
    )
)

:found_mysql
if "%MYSQL_CMD%"=="" (
    echo.
    echo =====================================================================
    echo [ERROR] MySQL CLI client (mysql.exe) could not be located.
    echo =====================================================================
    echo Please either:
    echo  1. Add your MySQL 'bin' folder to Windows PATH (e.g. C:\Program Files\MySQL\MySQL Server 8.0\bin)
    echo     and run this script again.
    echo.
    echo  2. OR import the database manually via MySQL Workbench:
    echo     a. Open MySQL Workbench and connect to your local MySQL instance.
    echo     b. Go to File -^> Open SQL Script.
    echo     c. Select 'database\setup_database.sql' from the MRTECHLMS folder.
    echo     d. Click the Execute (lightning bolt) icon to run the script.
    echo     e. Open and execute 'database\verify_database.sql' to verify setup.
    echo =====================================================================
    echo.
    pause
    exit /b 1
)

:: ---------------------------------------------------------------------
:: 2. Check MySQL Service
:: ---------------------------------------------------------------------
echo.
echo [*] Checking MySQL Windows service status...
set "SERVICE_FOUND=0"
for %%S in (MySQL80 MySQL84 MySQL MySQL90 MySQL91 mariadb) do (
    sc query "%%S" 2>nul | find /i "RUNNING" >nul
    if !errorlevel! equ 0 (
        echo [OK] Service '%%S' is RUNNING.
        set "SERVICE_FOUND=1"
        goto :service_checked
    )
)

if "!SERVICE_FOUND!"=="0" (
    echo [!] Notice: Could not detect a running MySQL Windows service under standard names (MySQL80, MySQL, etc.).
    echo     If your MySQL server is running as a custom service or standalone process, setup will still proceed.
)

:service_checked
:: ---------------------------------------------------------------------
:: 3. Prompt for Connection Details
:: ---------------------------------------------------------------------
echo.
echo ---------------------------------------------------------------------
echo Enter MySQL Connection Details (Press ENTER to accept default):
echo ---------------------------------------------------------------------

set /p "DB_HOST=MySQL Host [127.0.0.1]: "
if "%DB_HOST%"=="" set "DB_HOST=127.0.0.1"

set /p "DB_PORT=MySQL Port [3306]: "
if "%DB_PORT%"=="" set "DB_PORT=3306"

set /p "DB_USER=MySQL Username [root]: "
if "%DB_USER%"=="" set "DB_USER=root"

:: Secure password prompt via PowerShell without echoing to console
echo Enter MySQL Password for '%DB_USER%':
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$p = Read-Host -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p))"`) do (
    set "DB_PASS=%%P"
)

:: ---------------------------------------------------------------------
:: 4. Test Connection
:: ---------------------------------------------------------------------
echo.
echo [*] Testing connection to MySQL server at %DB_HOST%:%DB_PORT%...

if "%DB_PASS%"=="" (
    "%MYSQL_CMD%" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -e "SELECT 1;" >nul 2>nul
) else (
    "%MYSQL_CMD%" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" -e "SELECT 1;" >nul 2>nul
)

if %errorlevel% neq 0 (
    echo [ERROR] Could not connect to MySQL server.
    echo         Please check your host, port, username, and password.
    set "DB_PASS="
    pause
    exit /b 1
)
echo [OK] Successfully authenticated with MySQL server.

:: ---------------------------------------------------------------------
:: 5. Execute setup_database.sql
:: ---------------------------------------------------------------------
echo.
echo [*] Importing database/setup_database.sql (Creating database, 70 tables, indexes, and reference data)...
if not exist "database\setup_database.sql" (
    echo [ERROR] File 'database\setup_database.sql' was not found!
    set "DB_PASS="
    pause
    exit /b 1
)

if "%DB_PASS%"=="" (
    "%MYSQL_CMD%" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" < database\setup_database.sql
) else (
    "%MYSQL_CMD%" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" < database\setup_database.sql
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] An error occurred while executing setup_database.sql.
    echo         Review the MySQL output above for troubleshooting.
    set "DB_PASS="
    pause
    exit /b 1
)
echo [OK] Database schema and initial reference data created successfully!

:: ---------------------------------------------------------------------
:: 6. Execute verify_database.sql
:: ---------------------------------------------------------------------
echo.
echo [*] Running verification suite (database/verify_database.sql)...
echo ---------------------------------------------------------------------
if "%DB_PASS%"=="" (
    "%MYSQL_CMD%" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" < database\verify_database.sql
) else (
    "%MYSQL_CMD%" -h "%DB_HOST%" -P "%DB_PORT%" -u "%DB_USER%" -p"%DB_PASS%" < database\verify_database.sql
)
echo ---------------------------------------------------------------------

:: Clear password from memory
set "DB_PASS="

:: ---------------------------------------------------------------------
:: 7. Next Steps & Instructions
:: ---------------------------------------------------------------------
echo.
echo =====================================================================
echo                PORTABLE DATABASE SETUP COMPLETE!
echo =====================================================================
echo.
echo Next Steps to run MRTECHLMS on this computer:
echo.
echo 1. Configure your environment file:
echo    - Copy .env.example to .env:
echo        copy .env.example .env
echo    - Open .env and set:
echo        DB_HOST=%DB_HOST%
echo        DB_PORT=%DB_PORT%
echo        DB_USER=%DB_USER%
echo        DB_PASSWORD=^<your-mysql-password^>
echo        DB_NAME=mrtechlms
echo.
echo 2. Install dependencies (if not already installed):
echo        npm install
echo.
echo 3. Provision an administrator user:
echo    - Option A: Use the seeded development admin (admin@lms.com / Admin@123)
echo    - Option B: Create a custom secure admin:
echo        npm run create-admin
echo.
echo 4. Start MRTECHLMS:
echo        npm run dev
echo    Then open your browser at: http://localhost:3000
echo.
echo =====================================================================
pause
exit /b 0
