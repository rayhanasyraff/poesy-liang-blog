'use client';

import React from 'react';
import { createPortal } from 'react-dom';

export interface PublishModalProps {
  open: boolean;
  step: 'confirm' | 'done';
  isPublishing: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onGoToAdmin: () => void;
}

export function PublishModal({ open, step, isPublishing, onConfirm, onClose, onGoToAdmin }: PublishModalProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!isPublishing ? onClose : undefined}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-5">
        {step === 'confirm' ? (
          <>
            <h2 className="text-sm font-semibold mb-2">Publish blog?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to publish this blog? Your current draft will be saved and published.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPublishing}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPublishing}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isPublishing ? 'Publishing…' : 'Save & Publish'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold mb-2">Published!</h2>
            <p className="text-sm text-muted-foreground mb-5">Your blog is now live.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={onGoToAdmin}
                className="text-xs px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                Go to Admin
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
