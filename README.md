<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6e722654-814b-4949-b406-34fd9b60e178

## Run Locally

**Prerequisites:**  Node.js

Before starting the app, create `.env` with your MySQL connection details. For example, copy `.env.example` to `.env` and update `DB_PASSWORD` to the password configured for your MySQL account.


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Local MySQL database

For a fresh development database, create a MySQL 8.0+ database and load the schema plus sample records:

```sh
mysql -u root -p < setup-database.sql
```

The script creates the `mrtechlms` database, its tables, and sample users, courses, enrollments, assessments, and related records. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `.env` to match your local MySQL setup. The database credentials in `.env.example` are examples; change them for your environment.

If you already have an initialized database, use `npm run migrate` to apply pending schema migrations instead of reloading the sample setup script.
