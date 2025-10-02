import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Download MonoLog Android APK',
  description: 'Direct download of the MonoLog Android APK (sideload).'
};

export default function DownloadPage() {
  // Replace version + path once you build and place the APK under public/downloads
  const apkPath = '/downloads/monolog-0.3.0.apk';
  return (
    <div className="stack" style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Android App</h1>
      <p>You can sideload the MonoLog Android app by downloading the APK below. Because this is an unsigned example, you may need to allow installs from your browser / file manager.</p>
      <ol className="stack" style={{ gap: '0.5rem', paddingLeft: '1.25rem' }}>
        <li>Download the APK file.</li>
        <li>On your device, open the file once it finishes downloading.</li>
        <li>Approve the install (enable "Install unknown apps" if prompted).</li>
        <li>Open MonoLog from your app drawer.</li>
      </ol>
      <div className="card" style={{ padding: '1rem' }}>
        <strong>Current build:</strong>
        <div style={{ marginTop: '0.5rem' }}>
          <a className="button" href={apkPath} download>
            Download APK
          </a>
        </div>
        <p style={{ fontSize: '0.8rem', marginTop: '0.75rem', opacity: 0.75 }}>If the download does not start, long-press and choose "Download link".</p>
      </div>
      <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Security tip: Always verify the SHA-256 hash you publish next to the download to ensure file integrity.</p>
      <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Looking for the web app? <Link href="/">Return to MonoLog</Link>.</p>
    </div>
  );
}
