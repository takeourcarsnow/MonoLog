import Image from 'next/image';
import React from 'react';
import OfflineButton from '../components/OfflineButton';

export const metadata = {
  title: 'Offline - MonoLog',
  description: 'You are currently offline. Please check your internet connection.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="mb-8">
          <Image
            src="/logo.svg"
            alt="MonoLog"
            width={64}
            height={64}
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;re Offline
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            It looks like you&apos;re not connected to the internet. Don&apos;t worry, you can still view cached content.
          </p>
        </div>

        <div className="space-y-4">
          <OfflineButton />

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">While offline, you can:</p>
            <ul className="text-left space-y-1">
              <li>• View previously loaded posts</li>
              <li>• Browse your calendar</li>
              <li>• Access cached images</li>
              <li>• Your drafts will be saved automatically</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400">
            Your posts and comments will sync automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}