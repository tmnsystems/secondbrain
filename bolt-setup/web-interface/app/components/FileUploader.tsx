'use client'

import { useState, useRef } from 'react'
import { DocumentTextIcon, DocumentPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface FileItem {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'processed' | 'error'
  uploadTime: Date
}

export default function FileUploader() {
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'coaching_call_20250501.txt',
      size: 125000,
      type: 'text/plain',
      status: 'processed',
      uploadTime: new Date('2025-05-01T10:30:00')
    },
    {
      id: '2',
      name: 'strategy_session.txt',
      size: 87500,
      type: 'text/plain',
      status: 'processed',
      uploadTime: new Date('2025-04-28T14:15:00')
    }
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    // Convert FileList to array for easier processing
    const newFiles = Array.from(e.target.files).map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as const,
      uploadTime: new Date()
    }))
    
    setFiles(prev => [...prev, ...newFiles])
    
    // In a real app, this would upload files to the server
    // For demo purposes, let's simulate processing
    newFiles.forEach(file => {
      setTimeout(() => {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'processing' } : f
        ))
        
        // Simulate processing completion
        setTimeout(() => {
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'processed' } : f
          ))
        }, 3000 + Math.random() * 2000)
      }, 1000 + Math.random() * 1000)
    })
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  
  return (
    <div className="page-container pb-20">
      <h2 className="text-xl font-semibold mb-4">Transcript Files</h2>
      
      {/* File upload section */}
      <div className="card p-6 mb-6">
        <div className="text-center">
          <DocumentPlusIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Upload Transcripts</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Upload transcripts to analyze and extract your unique coaching style
          </p>
          
          <input
            type="file"
            accept=".txt,.docx,.pdf"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
          >
            Select Files
          </button>
        </div>
      </div>
      
      {/* File list */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Your Files</h3>
        
        {files.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-6">
            No files uploaded yet
          </p>
        ) : (
          <ul className="space-y-3">
            {files.map(file => (
              <li key={file.id} className="card">
                <div className="p-4 flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400 mr-3" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)} · {file.uploadTime.toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    {file.status === 'pending' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                        Pending
                      </span>
                    )}
                    
                    {file.status === 'processing' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                        Processing
                      </span>
                    )}
                    
                    {file.status === 'processed' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 flex items-center">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Processed
                      </span>
                    )}
                    
                    {file.status === 'error' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                        Error
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}