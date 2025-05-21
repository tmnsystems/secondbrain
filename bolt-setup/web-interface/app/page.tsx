'use client'

import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import MobileNavBar from './components/MobileNavBar'
import ChatInterface from './components/ChatInterface'
import FileUploader from './components/FileUploader'
import FeedbackPanel from './components/FeedbackPanel'

export default function Home() {
  const [activePage, setActivePage] = useState('chat')
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  
  // Mobile swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (activePage === 'chat') setActivePage('files')
      if (activePage === 'files') setActivePage('settings')
    },
    onSwipedRight: () => {
      if (activePage === 'settings') setActivePage('files')
      if (activePage === 'files') setActivePage('chat')
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false
  })
  
  // Toggle feedback panel
  const toggleFeedback = () => {
    setIsFeedbackOpen(!isFeedbackOpen)
  }
  
  return (
    <main className="min-h-screen flex flex-col" {...swipeHandlers}>
      {/* Top header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="page-container">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            SecondBrain
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your AI-powered business coaching system
          </p>
        </div>
      </header>
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Chat page */}
        <div className={`absolute inset-0 transition-all duration-300 ease-in-out transform ${
          activePage === 'chat' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}>
          <ChatInterface onRequestFeedback={toggleFeedback} />
        </div>
        
        {/* Files page */}
        <div className={`absolute inset-0 transition-all duration-300 ease-in-out transform ${
          activePage === 'files' ? 'translate-x-0 opacity-100' : 
          activePage === 'chat' ? '-translate-x-full opacity-0 pointer-events-none' : 
          'translate-x-full opacity-0 pointer-events-none'
        }`}>
          <FileUploader />
        </div>
        
        {/* Settings page */}
        <div className={`absolute inset-0 transition-all duration-300 ease-in-out transform ${
          activePage === 'settings' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
        }`}>
          <div className="page-container">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>
            <div className="card p-4">
              <h3 className="text-lg font-medium mb-2">AI Models</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Model
                  </label>
                  <select className="input-field">
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="gpt4">GPT-4 (OpenAI)</option>
                    <option value="mistral">Mistral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Style Emphasis
                  </label>
                  <input type="range" min="0" max="100" className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Feedback panel (slides up from bottom) */}
        <div className={`fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg rounded-t-2xl transition-transform duration-300 transform ${
          isFeedbackOpen ? 'translate-y-0' : 'translate-y-full'
        }`} style={{ height: '70vh', zIndex: 50 }}>
          <FeedbackPanel onClose={toggleFeedback} />
        </div>
      </div>
      
      {/* Bottom navigation for mobile */}
      <MobileNavBar active={activePage} onChange={setActivePage} />
    </main>
  )
}