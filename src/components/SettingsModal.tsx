'use client';

import { X } from 'lucide-react';
import { Modal } from './ui';
import CategoriesManager from './CategoriesManager';

/** Workspace settings. Categories live here; add further sections below as they're needed. */
export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-[15px] font-semibold text-fg">Settings</h2>
        <button type="button" className="btn-quiet btn-icon" onClick={onClose} aria-label="Close settings"><X size={16} /></button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5"><CategoriesManager embedded /></div>
    </Modal>
  );
}
