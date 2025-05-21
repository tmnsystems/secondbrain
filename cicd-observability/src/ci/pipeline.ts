/**
 * CI Pipeline Utilities
 * 
 * This module provides utilities for working with CI pipelines,
 * including status reporting, artifact management, and metrics.
 */

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Status of a CI pipeline stage
 */
export enum PipelineStageStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILURE = 'failure',
  SKIPPED = 'skipped',
}

/**
 * Interface for a CI pipeline stage
 */
export interface PipelineStage {
  name: string;
  status: PipelineStageStatus;
  startTime?: Date;
  endTime?: Date;
  artifacts?: string[];
  metrics?: Record<string, number>;
  logs?: string[];
}

/**
 * Interface for a CI pipeline
 */
export interface Pipeline {
  id: string;
  name: string;
  repository: string;
  branch: string;
  commit: string;
  status: PipelineStageStatus;
  stages: PipelineStage[];
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  totalErrors: number;
  totalWarnings: number;
}

/**
 * Class representing a CI pipeline manager
 */
export class PipelineManager {
  private pipelines: Map<string, Pipeline> = new Map();
  private artifactsDir: string;
  
  /**
   * Create a new PipelineManager
   * @param artifactsDir - Directory to store artifacts
   */
  constructor(artifactsDir: string) {
    this.artifactsDir = artifactsDir;
  }
  
  /**
   * Create a new pipeline
   * @param name - Pipeline name
   * @param repository - Repository name
   * @param branch - Branch name
   * @param commit - Commit hash
   * @returns The new pipeline
   */
  public createPipeline(
    name: string,
    repository: string,
    branch: string,
    commit: string
  ): Pipeline {
    const id = `${repository}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const pipeline: Pipeline = {
      id,
      name,
      repository,
      branch,
      commit,
      status: PipelineStageStatus.PENDING,
      stages: [],
      startTime: new Date(),
      totalErrors: 0,
      totalWarnings: 0,
    };
    
    this.pipelines.set(id, pipeline);
    return pipeline;
  }
  
  /**
   * Get a pipeline by ID
   * @param id - Pipeline ID
   * @returns The pipeline or undefined if not found
   */
  public getPipeline(id: string): Pipeline | undefined {
    return this.pipelines.get(id);
  }
  
  /**
   * List all pipelines
   * @returns Array of pipelines
   */
  public listPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values());
  }
  
  /**
   * Add a stage to a pipeline
   * @param pipelineId - Pipeline ID
   * @param stageName - Stage name
   * @returns The new stage or undefined if pipeline not found
   */
  public addStage(pipelineId: string, stageName: string): PipelineStage | undefined {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return undefined;
    }
    
    const stage: PipelineStage = {
      name: stageName,
      status: PipelineStageStatus.PENDING,
      startTime: new Date(),
      artifacts: [],
      metrics: {},
      logs: [],
    };
    
    pipeline.stages.push(stage);
    return stage;
  }
  
  /**
   * Update the status of a pipeline stage
   * @param pipelineId - Pipeline ID
   * @param stageName - Stage name
   * @param status - New status
   * @returns true if the stage was updated, false otherwise
   */
  public updateStageStatus(
    pipelineId: string,
    stageName: string,
    status: PipelineStageStatus
  ): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return false;
    }
    
    const stage = pipeline.stages.find(s => s.name === stageName);
    
    if (!stage) {
      return false;
    }
    
    stage.status = status;
    
    if (status === PipelineStageStatus.SUCCESS || 
        status === PipelineStageStatus.FAILURE) {
      stage.endTime = new Date();
    }
    
    // Update pipeline status based on stages
    this.updatePipelineStatus(pipelineId);
    
    return true;
  }
  
  /**
   * Add an artifact to a pipeline stage
   * @param pipelineId - Pipeline ID
   * @param stageName - Stage name
   * @param artifactPath - Path to the artifact
   * @returns true if the artifact was added, false otherwise
   */
  public async addArtifact(
    pipelineId: string,
    stageName: string,
    artifactPath: string
  ): Promise<boolean> {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return false;
    }
    
    const stage = pipeline.stages.find(s => s.name === stageName);
    
    if (!stage) {
      return false;
    }
    
    if (!stage.artifacts) {
      stage.artifacts = [];
    }
    
    const artifactFilename = path.basename(artifactPath);
    const destinationPath = path.join(
      this.artifactsDir,
      pipelineId,
      stageName,
      artifactFilename
    );
    
    try {
      // Create directories if they don't exist
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      
      // Copy the artifact
      await fs.copyFile(artifactPath, destinationPath);
      
      // Add to artifacts list
      stage.artifacts.push(destinationPath);
      
      return true;
    } catch (error) {
      console.error(`Failed to add artifact: ${error}`);
      return false;
    }
  }
  
  /**
   * Add a metric to a pipeline stage
   * @param pipelineId - Pipeline ID
   * @param stageName - Stage name
   * @param metricName - Metric name
   * @param value - Metric value
   * @returns true if the metric was added, false otherwise
   */
  public addMetric(
    pipelineId: string,
    stageName: string,
    metricName: string,
    value: number
  ): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return false;
    }
    
    const stage = pipeline.stages.find(s => s.name === stageName);
    
    if (!stage) {
      return false;
    }
    
    if (!stage.metrics) {
      stage.metrics = {};
    }
    
    stage.metrics[metricName] = value;
    return true;
  }
  
  /**
   * Add a log message to a pipeline stage
   * @param pipelineId - Pipeline ID
   * @param stageName - Stage name
   * @param logMessage - Log message
   * @returns true if the log was added, false otherwise
   */
  public addLog(
    pipelineId: string,
    stageName: string,
    logMessage: string
  ): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return false;
    }
    
    const stage = pipeline.stages.find(s => s.name === stageName);
    
    if (!stage) {
      return false;
    }
    
    if (!stage.logs) {
      stage.logs = [];
    }
    
    // Check for errors or warnings in log message
    if (logMessage.toLowerCase().includes('error')) {
      pipeline.totalErrors += 1;
    } else if (logMessage.toLowerCase().includes('warn')) {
      pipeline.totalWarnings += 1;
    }
    
    stage.logs.push(logMessage);
    return true;
  }
  
  /**
   * Complete a pipeline
   * @param pipelineId - Pipeline ID
   * @param status - Final status
   * @returns true if the pipeline was completed, false otherwise
   */
  public completePipeline(
    pipelineId: string,
    status: PipelineStageStatus = PipelineStageStatus.SUCCESS
  ): boolean {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return false;
    }
    
    pipeline.status = status;
    pipeline.endTime = new Date();
    
    if (pipeline.startTime && pipeline.endTime) {
      pipeline.totalDuration = 
        pipeline.endTime.getTime() - pipeline.startTime.getTime();
    }
    
    return true;
  }
  
  /**
   * Export pipeline to JSON
   * @param pipelineId - Pipeline ID
   * @returns JSON string of the pipeline or undefined if not found
   */
  public exportPipelineToJson(pipelineId: string): string | undefined {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return undefined;
    }
    
    return JSON.stringify(pipeline, null, 2);
  }
  
  /**
   * Import pipeline from JSON
   * @param json - JSON string of the pipeline
   * @returns The imported pipeline
   */
  public importPipelineFromJson(json: string): Pipeline {
    const pipeline = JSON.parse(json) as Pipeline;
    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }
  
  /**
   * Get pipeline metrics
   * @param pipelineId - Pipeline ID
   * @returns Object containing pipeline metrics or undefined if not found
   */
  public getPipelineMetrics(pipelineId: string): Record<string, number> | undefined {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return undefined;
    }
    
    const metrics: Record<string, number> = {
      totalDuration: pipeline.totalDuration || 0,
      totalErrors: pipeline.totalErrors,
      totalWarnings: pipeline.totalWarnings,
      totalStages: pipeline.stages.length,
      successfulStages: pipeline.stages.filter(s => s.status === PipelineStageStatus.SUCCESS).length,
      failedStages: pipeline.stages.filter(s => s.status === PipelineStageStatus.FAILURE).length,
    };
    
    // Add stage-specific metrics
    pipeline.stages.forEach(stage => {
      if (stage.metrics) {
        Object.entries(stage.metrics).forEach(([key, value]) => {
          metrics[`${stage.name}_${key}`] = value;
        });
      }
      
      // Add stage duration if available
      if (stage.startTime && stage.endTime) {
        metrics[`${stage.name}_duration`] = 
          stage.endTime.getTime() - stage.startTime.getTime();
      }
    });
    
    return metrics;
  }
  
  /**
   * Private method to update pipeline status based on stages
   * @param pipelineId - Pipeline ID
   */
  private updatePipelineStatus(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      return;
    }
    
    // If any stage failed, pipeline is failed
    if (pipeline.stages.some(s => s.status === PipelineStageStatus.FAILURE)) {
      pipeline.status = PipelineStageStatus.FAILURE;
      return;
    }
    
    // If all stages succeeded, pipeline is successful
    if (pipeline.stages.length > 0 && 
        pipeline.stages.every(s => s.status === PipelineStageStatus.SUCCESS)) {
      pipeline.status = PipelineStageStatus.SUCCESS;
      return;
    }
    
    // If any stage is running, pipeline is running
    if (pipeline.stages.some(s => s.status === PipelineStageStatus.RUNNING)) {
      pipeline.status = PipelineStageStatus.RUNNING;
      return;
    }
    
    // Otherwise, pipeline is pending
    pipeline.status = PipelineStageStatus.PENDING;
  }
}