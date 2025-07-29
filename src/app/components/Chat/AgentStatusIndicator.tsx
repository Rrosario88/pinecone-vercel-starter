import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentStatusIndicatorProps {
  isActive: boolean;
  currentAgent?: 'researcher' | 'analyst' | 'reviewer' | 'finalizing' | null;
  isGenerating?: boolean;
}

const agentSteps = [
  {
    key: 'researcher',
    icon: '🔍',
    name: 'Research Specialist',
    action: 'Searching documents...',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    key: 'analyst',
    icon: '📊',
    name: 'Analysis Expert',
    action: 'Analyzing findings...',
    color: 'from-purple-500 to-pink-500'
  },
  {
    key: 'reviewer',
    icon: '✅',
    name: 'Quality Reviewer',
    action: 'Reviewing response quality...',
    color: 'from-green-500 to-emerald-500'
  },
  {
    key: 'finalizing',
    icon: '✨',
    name: 'Final Assembly',
    action: 'Crafting comprehensive answer...',
    color: 'from-amber-500 to-orange-500'
  }
];

const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ 
  isActive, 
  currentAgent,
  isGenerating = false 
}) => {
  const currentStep = agentSteps.find(step => step.key === currentAgent);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-4 relative overflow-hidden"
        >
          {/* Main Status Bar */}
          <div className={`relative rounded-lg p-3 border border-gray-200 dark:border-gray-700 bg-gradient-to-r ${
            currentStep?.color || 'from-blue-500 to-purple-500'
          } bg-opacity-10 dark:bg-opacity-20`}>
            
            {/* Animated Background Pulse */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${
                currentStep?.color || 'from-blue-500 to-purple-500'
              } opacity-5`}
              animate={{
                opacity: [0.05, 0.15, 0.05],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Content */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Animated Robot Icon */}
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="text-xl"
                >
                  🤖
                </motion.div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      Multi-Agent Analysis Active
                    </span>
                    {isGenerating && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
                      />
                    )}
                  </div>
                  
                  {currentStep && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-2"
                    >
                      <span>{currentStep.icon}</span>
                      <span>{currentStep.name}:</span>
                      <span className="italic">{currentStep.action}</span>
                    </motion.div>
                  )}
                </div>
              </div>
              
              {/* Agent Progress Dots */}
              <div className="flex space-x-2">
                {agentSteps.map((step, index) => (
                  <motion.div
                    key={step.key}
                    className={`w-2 h-2 rounded-full ${
                      step.key === currentAgent
                        ? 'bg-blue-500'
                        : currentAgent && agentSteps.findIndex(s => s.key === currentAgent) > index
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    animate={step.key === currentAgent ? {
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1]
                    } : {}}
                    transition={{
                      duration: 1,
                      repeat: step.key === currentAgent ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Agent Team Overview (when not actively processing) */}
          {isActive && !currentAgent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex flex-wrap gap-2 justify-center"
            >
              {agentSteps.slice(0, 3).map((agent) => (
                <div
                  key={agent.key}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs"
                >
                  <span>{agent.icon}</span>
                  <span className="text-gray-600 dark:text-gray-400">{agent.name}</span>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentStatusIndicator;