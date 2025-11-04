'use client';

import React from 'react';

export default function OfflineButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
    >
      Try Again
    </button>
  );
}