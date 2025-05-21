'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

enum FeedbackType {
  STYLE = 'style',
  CONTENT = 'content',
  ACCURACY = 'accuracy',
  TONE = 'tone',
  STRUCTURE = 'structure'
}

interface FeedbackPanelProps {
  onClose: () => void
}

export default function FeedbackPanel({ onClose }: FeedbackPanelProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [rating, setRating] = useState<number>(3)
  const [comments, setComments] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real app, this would send feedback to the server
    console.log({
      type: selectedType,
      rating,
      comments
    })
    
    setSubmitted(true)
  }
  
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="p-2 rounded-full bg-green-100 mb-4">
          <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Your feedback helps improve the system's understanding of your style and preferences.
        </p>
        <button
          onClick={onClose}
          className="btn-primary"
        >
          Close
        </button>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">Provide Feedback</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Feedback form */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What aspect would you like to provide feedback on?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(FeedbackType).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    selectedType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              How would you rate this aspect?
            </label>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Poor</span>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      rating === value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500">Excellent</span>
            </div>
          </div>
          
          {/* Comments */}
          <div>
            <label htmlFor="comments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional comments or suggestions
            </label>
            <textarea
              id="comments"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="input-field"
              placeholder="What specific changes would you like to see?"
            />
          </div>
        </form>
      </div>
      
      {/* Submit button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleSubmit}
          className="btn-primary w-full"
          disabled={!selectedType}
        >
          Submit Feedback
        </button>
      </div>
    </div>
  )
}