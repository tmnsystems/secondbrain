'use client'

import { ChatBubbleLeftRightIcon, FolderIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'

interface MobileNavBarProps {
  active: string
  onChange: (page: string) => void
}

export default function MobileNavBar({ active, onChange }: MobileNavBarProps) {
  return (
    <nav className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 fixed bottom-0 inset-x-0 z-30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={() => onChange('chat')}
            className={`flex flex-col items-center justify-center w-full h-full text-sm font-medium ${
              active === 'chat' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <ChatBubbleLeftRightIcon className="h-6 w-6 mb-1" />
            <span>Chat</span>
          </button>
          
          <button
            onClick={() => onChange('files')}
            className={`flex flex-col items-center justify-center w-full h-full text-sm font-medium ${
              active === 'files' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <FolderIcon className="h-6 w-6 mb-1" />
            <span>Files</span>
          </button>
          
          <button
            onClick={() => onChange('settings')}
            className={`flex flex-col items-center justify-center w-full h-full text-sm font-medium ${
              active === 'settings' 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Cog6ToothIcon className="h-6 w-6 mb-1" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </nav>
  )
}