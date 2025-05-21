/**
 * System Monitor Module
 * 
 * Monitors system resources, running processes, and application health.
 * Provides data for performance optimization and issue detection.
 */

import { executeCommand, CommandExecutionResult } from './commandExecutor';

export interface MonitoringOptions {
  cwd?: string;
  timeout?: number;
  interval?: number; // Interval in milliseconds for continuous monitoring
  metrics?: string[]; // Which metrics to monitor
}

// Monitoring target types
type MonitoringTarget = 'cpu' | 'memory' | 'disk' | 'network' | 'process' | 'custom';

/**
 * Monitor system resources or running processes
 * 
 * @param target The resource or process to monitor
 * @param options Monitoring options
 * @returns Promise with the monitoring result
 */
export async function systemMonitor(
  target: MonitoringTarget | string,
  options: MonitoringOptions = {}
): Promise<CommandExecutionResult> {
  const {
    cwd = process.cwd(),
    timeout = 10000,
    metrics = ['usage']
  } = options;
  
  // Build the monitoring command based on the target
  let command: string;
  const platform = process.platform;
  
  switch (target) {
    case 'cpu':
      command = platform === 'win32' 
        ? 'wmic cpu get loadpercentage' 
        : 'top -l 1 | grep "CPU usage"';
      break;
      
    case 'memory':
      command = platform === 'win32'
        ? 'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize'
        : 'vm_stat && top -l 1 | grep PhysMem';
      break;
      
    case 'disk':
      command = platform === 'win32'
        ? 'wmic logicaldisk get size,freespace,caption'
        : 'df -h';
      break;
      
    case 'network':
      command = platform === 'win32'
        ? 'netstat -an'
        : 'netstat -an | grep ESTABLISHED';
      break;
      
    case 'process':
      // If metrics includes a specific process name/id
      const processId = metrics[0] || '';
      command = platform === 'win32'
        ? `tasklist ${processId ? `/FI "PID eq ${processId}"` : ''}`
        : `ps aux ${processId ? `| grep ${processId}` : ''}`;
      break;
      
    case 'custom':
      // For custom monitoring commands
      if (metrics.length === 0 || !metrics[0]) {
        return {
          success: false,
          output: '',
          error: 'Custom monitoring requires at least one metric',
          exitCode: -1,
          executionTime: 0
        };
      }
      command = metrics[0];
      break;
      
    default:
      // Treat the target as a process name to monitor
      command = platform === 'win32'
        ? `tasklist /FI "IMAGENAME eq ${target}"`
        : `ps aux | grep ${target}`;
  }
  
  // Execute the monitoring command
  return executeCommand(command, { cwd, timeout });
}
