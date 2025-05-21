'use client'

import { useState } from 'react'
import SecondBrainConnector from '../components/secondbrain/SecondBrainConnector'
import { PanelHeader } from '../components/ui/PanelHeader'
import { PanelHeaderButton } from '../components/ui/PanelHeaderButton'

export default function SecondBrainPage() {
  const [activeTab, setActiveTab] = useState<'bridge' | 'content' | 'agents'>('bridge')
  
  return (
    <div className="flex flex-col h-full">
      <PanelHeader className="px-4 py-2 border-b">
        <h1 className="text-xl font-bold">SecondBrain Integration</h1>
        
        <div className="flex gap-2">
          <PanelHeaderButton
            isSelected={activeTab === 'bridge'}
            onClick={() => setActiveTab('bridge')}
          >
            API Bridge
          </PanelHeaderButton>
          
          <PanelHeaderButton
            isSelected={activeTab === 'content'}
            onClick={() => setActiveTab('content')}
          >
            Content Generator
          </PanelHeaderButton>
          
          <PanelHeaderButton
            isSelected={activeTab === 'agents'}
            onClick={() => setActiveTab('agents')}
          >
            Agents
          </PanelHeaderButton>
        </div>
      </PanelHeader>
      
      <div className="flex-1 overflow-auto">
        {activeTab === 'bridge' && (
          <SecondBrainConnector />
        )}
        
        {activeTab === 'content' && (
          <div className="p-4">
            <h2 className="text-xl font-semibold">Content Generator</h2>
            <p className="text-gray-500 mt-2">
              Advanced content generation features will be added here.
            </p>
          </div>
        )}
        
        {activeTab === 'agents' && (
          <div className="p-4">
            <h2 className="text-xl font-semibold">Agent Workflows</h2>
            <p className="text-gray-500 mt-2">
              Agent configuration and execution interface will be added here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}