# MonoLog Backup and Recovery Guide

To create a comprehensive backup of your MonoLog project (codebase, Supabase database, images/storage, and configurations) that allows recovery even if your Supabase accounts are deleted, follow these steps. This ensures you can restore to a new Supabase instance or alternative provider. I'll break it down by component, with commands tailored for your Windows/PowerShell environment.

## 1. Backup the Codebase
Your project is already a Git repository, so version control handles most of the code. But to capture everything (including dependencies, build artifacts, and local configs), create a full archive.

- **Push code to a remote repository** (e.g., GitHub) for redundancy:
  ```
  git add .
  git commit -m "Backup commit before full backup"
  git push origin main
  ```
  If you don't have a remote, create one on GitHub/GitLab and push.

- **Create a full folder archive** (includes `node_modules`, `.env.local`, etc.):
  ```
  Compress-Archive -Path "C:\Users\i\Desktop\webdev\MonoLog" -DestinationPath "C:\Users\i\Desktop\MonoLog_Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip" -Force
  ```
  Store this ZIP in multiple locations (external drive, cloud storage like Google Drive/OneDrive, or another machine).

- **Backup environment files separately** (sensitive data):
  - Copy `.env.local` to a secure location (e.g., encrypted USB or password manager). This contains your Supabase keys and other secrets.
  - If you have custom configs (e.g., `next.config.mjs`), note any manual overrides.

## 2. Backup the Supabase Database
Your app uses Supabase for the database. You'll need the Supabase CLI to export schema and data. If your Supabase project gets deleted, this dump allows restoration to a new project.

- **Install Supabase CLI** (if not already installed):
  ```
  npm install -g supabase
  ```

- **Login to Supabase** (use your account credentials):
  ```
  supabase login
  ```

- **Link your project** (replace `your-project-ref` with your actual Supabase project reference from the dashboard):
  ```
  supabase link --project-ref your-project-ref
  ```

- **Export the database schema and data**:
  - For schema only (structure):
    ```
    supabase db dump --schema-only > C:\Users\i\Desktop\supabase_schema_backup.sql
    ```
  - For full data dump (includes all rows):
    ```
    supabase db dump > C:\Users\i\Desktop\supabase_full_backup.sql
    ```
    This creates SQL files you can store securely. The full dump is large but complete.

- **Alternative without CLI** (if CLI fails):
  - Go to your Supabase dashboard > SQL Editor.
  - Run: `SELECT * FROM pg_tables;` to list tables, then manually export each with `pg_dump` via a tool like pgAdmin connected to your Supabase DB URL (from `.env.local`).

Store the SQL files with your ZIP archive.

## 3. Backup Images and Storage
Images are stored in Supabase Storage buckets. Download them all to avoid losing user uploads.

- **Install required packages** (if not already in your project):
  ```
  npm install @supabase/supabase-js
  ```

- **Create a backup script** (add this as a new file `scripts/backup-storage.js` in your project):
  ```javascript
  const { createClient } = require('@supabase/supabase-js');
  const fs = require('fs');
  const path = require('path');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role for admin access
  );

  async function backupStorage() {
    const backupDir = path.join(__dirname, '..', 'storage_backup');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    // List buckets (adjust if you have custom buckets)
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;

    for (const bucket of buckets) {
      const bucketDir = path.join(backupDir, bucket.name);
      if (!fs.existsSync(bucketDir)) fs.mkdirSync(bucketDir);

      // List files in bucket
      const { data: files, error: listError } = await supabase.storage.from(bucket.name).list();
      if (listError) continue;

      for (const file of files) {
        const { data, error: downloadError } = await supabase.storage.from(bucket.name).download(file.name);
        if (downloadError) continue;

        const filePath = path.join(bucketDir, file.name);
        fs.writeFileSync(filePath, Buffer.from(await data.arrayBuffer()));
      }
    }

    console.log('Storage backup complete');
  }

  backupStorage().catch(console.error);
  ```
  - Load your env vars: `node -r dotenv/config scripts/backup-storage.js` (ensure `dotenv` is installed).
  - This downloads all files to a `storage_backup` folder in your project root. ZIP and store it with your other backups.

- **Alternative manual method**:
  - Use the Supabase dashboard > Storage to download files manually, or use a tool like `rclone` configured for Supabase.

## 4. Additional Considerations
- **Frequency**: Automate backups weekly/monthly using Windows Task Scheduler to run the scripts.
- **Security**: Encrypt backups (e.g., with 7-Zip or VeraCrypt) since they contain sensitive data.
- **Testing Recovery**: After backing up, test restoration:
  - Create a new Supabase project.
  - Restore DB: `psql -h your-new-db-host -U postgres -d postgres < supabase_full_backup.sql`
  - Upload storage files via dashboard or script.
  - Deploy code with new env vars.
- **Costs**: Supabase backups may incur egress fees; monitor usage.
- **If Supabase is deleted**: You'll need to recreate the project and restore from dumps. Supabase doesn't provide account-level recovery, so this local backup is critical.

If you encounter issues (e.g., CLI auth errors), share the error messages for troubleshooting. This setup ensures full recoverability.