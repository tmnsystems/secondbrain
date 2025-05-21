import {
  Experiment,
  Variant,
  MetricEventData,
  UserAssignment,
  ExperimentAnalysis,
  VariantAnalysis,
  AnalysisTimeframe,
  ConfidenceInterval,
  StatisticalSignificance
} from './types';

/**
 * The experiment analyzer calculates statistics and metrics for experiments
 */
export class ExperimentAnalyzer {
  /**
   * Analyzes an experiment and its metrics
   * 
   * @param experiment The experiment to analyze
   * @param variants The variants in the experiment
   * @param assignments The user assignments for the experiment
   * @param metricEvents The metric events for the experiment
   * @param timeframe The timeframe to analyze
   * @returns The experiment analysis
   */
  static analyzeExperiment(
    experiment: Experiment,
    variants: Variant[],
    assignments: UserAssignment[],
    metricEvents: Map<string, MetricEventData[]>,
    timeframe: AnalysisTimeframe = AnalysisTimeframe.ALL_TIME
  ): ExperimentAnalysis {
    const variantAnalyses = variants.map(variant => {
      return this.analyzeVariant(
        experiment,
        variant,
        assignments.filter(a => a.variantId === variant.id),
        metricEvents,
        timeframe
      );
    });

    const controlVariant = variants.find(v => v.isControl);
    if (!controlVariant) {
      throw new Error(`No control variant found for experiment ${experiment.id}`);
    }

    const controlAnalysis = variantAnalyses.find(a => a.variantId === controlVariant.id);
    if (!controlAnalysis) {
      throw new Error(`Analysis for control variant ${controlVariant.id} not found`);
    }

    // Compare each treatment variant against the control
    for (const analysis of variantAnalyses) {
      if (analysis.variantId !== controlAnalysis.variantId) {
        analysis.comparisonToControl = this.compareVariants(controlAnalysis, analysis);
      }
    }

    return {
      experimentId: experiment.id,
      experimentName: experiment.name,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      status: experiment.status,
      totalUsers: assignments.length,
      variants: variantAnalyses,
      timeframe: timeframe,
      analysisDate: new Date()
    };
  }

  /**
   * Analyzes a variant in an experiment
   * 
   * @param experiment The experiment
   * @param variant The variant to analyze
   * @param assignments The user assignments for the variant
   * @param metricEvents The metric events for the experiment
   * @param timeframe The timeframe to analyze
   * @returns The variant analysis
   */
  static analyzeVariant(
    experiment: Experiment,
    variant: Variant,
    assignments: UserAssignment[],
    metricEvents: Map<string, MetricEventData[]>,
    timeframe: AnalysisTimeframe
  ): VariantAnalysis {
    const userIds = assignments.map(a => a.userId);
    const variantId = variant.id;
    
    // Calculate metrics for each metric in the experiment
    const metrics: Record<string, {
      average: number;
      total: number;
      count: number;
      confidenceInterval: ConfidenceInterval;
    }> = {};
    
    for (const metricId of experiment.metrics) {
      const events = (metricEvents.get(metricId) || []).filter(e => {
        if (!userIds.includes(e.userId)) return false;
        
        if (timeframe === AnalysisTimeframe.ALL_TIME) {
          return true;
        } else if (timeframe === AnalysisTimeframe.LAST_WEEK) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return e.timestamp >= oneWeekAgo;
        } else if (timeframe === AnalysisTimeframe.LAST_MONTH) {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return e.timestamp >= oneMonthAgo;
        } else if (timeframe === AnalysisTimeframe.LAST_DAY) {
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          return e.timestamp >= oneDayAgo;
        }
        
        return true;
      });
      
      if (events.length === 0) {
        metrics[metricId] = {
          average: 0,
          total: 0,
          count: 0,
          confidenceInterval: {
            lower: 0,
            upper: 0,
            confidence: 0.95
          }
        };
        continue;
      }
      
      const values = events.map(e => e.value);
      const count = values.length;
      const total = values.reduce((sum, value) => sum + value, 0);
      const average = total / count;
      
      // Calculate confidence interval using standard error
      const stdDev = this.calculateStandardDeviation(values);
      const standardError = stdDev / Math.sqrt(count);
      const zScore = 1.96; // 95% confidence level
      
      const confidenceInterval = {
        lower: average - zScore * standardError,
        upper: average + zScore * standardError,
        confidence: 0.95
      };
      
      metrics[metricId] = {
        average,
        total,
        count,
        confidenceInterval
      };
    }
    
    return {
      variantId,
      variantName: variant.name,
      isControl: variant.isControl,
      numberOfUsers: assignments.length,
      metrics,
      comparisonToControl: null // This will be set later for treatment variants
    };
  }

  /**
   * Compares a treatment variant to the control variant
   * 
   * @param controlAnalysis The control variant analysis
   * @param treatmentAnalysis The treatment variant analysis
   * @returns The comparison results
   */
  static compareVariants(
    controlAnalysis: VariantAnalysis,
    treatmentAnalysis: VariantAnalysis
  ): Record<string, {
    relativeImprovement: number;
    absoluteImprovement: number;
    significance: StatisticalSignificance;
    pValue: number;
  }> {
    const comparison: Record<string, {
      relativeImprovement: number;
      absoluteImprovement: number;
      significance: StatisticalSignificance;
      pValue: number;
    }> = {};
    
    // Compare each metric
    for (const metricId in controlAnalysis.metrics) {
      if (!treatmentAnalysis.metrics[metricId]) continue;
      
      const controlMetric = controlAnalysis.metrics[metricId];
      const treatmentMetric = treatmentAnalysis.metrics[metricId];
      
      if (controlMetric.count === 0 || treatmentMetric.count === 0) {
        comparison[metricId] = {
          relativeImprovement: 0,
          absoluteImprovement: 0,
          significance: StatisticalSignificance.NOT_SIGNIFICANT,
          pValue: 1
        };
        continue;
      }
      
      const absoluteImprovement = treatmentMetric.average - controlMetric.average;
      let relativeImprovement = 0;
      
      if (controlMetric.average !== 0) {
        relativeImprovement = (absoluteImprovement / Math.abs(controlMetric.average)) * 100;
      }
      
      // Calculate p-value using t-test
      const pValue = this.calculatePValue(
        controlMetric.average,
        treatmentMetric.average,
        controlMetric.confidenceInterval.upper - controlMetric.average,
        treatmentMetric.confidenceInterval.upper - treatmentMetric.average,
        controlMetric.count,
        treatmentMetric.count
      );
      
      let significance = StatisticalSignificance.NOT_SIGNIFICANT;
      
      if (pValue <= 0.01) {
        significance = StatisticalSignificance.HIGHLY_SIGNIFICANT;
      } else if (pValue <= 0.05) {
        significance = StatisticalSignificance.SIGNIFICANT;
      } else if (pValue <= 0.1) {
        significance = StatisticalSignificance.MARGINALLY_SIGNIFICANT;
      }
      
      comparison[metricId] = {
        relativeImprovement,
        absoluteImprovement,
        significance,
        pValue
      };
    }
    
    return comparison;
  }

  /**
   * Calculates the standard deviation of a set of values
   * 
   * @param values The values
   * @returns The standard deviation
   */
  private static calculateStandardDeviation(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;
    
    const mean = values.reduce((sum, value) => sum + value, 0) / n;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / n;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculates the p-value for a comparison of two means
   * 
   * @param mean1 The mean of the first sample
   * @param mean2 The mean of the second sample
   * @param standardError1 The standard error of the first sample
   * @param standardError2 The standard error of the second sample
   * @param n1 The size of the first sample
   * @param n2 The size of the second sample
   * @returns The p-value
   */
  private static calculatePValue(
    mean1: number,
    mean2: number,
    standardError1: number,
    standardError2: number,
    n1: number,
    n2: number
  ): number {
    // Calculate t-statistic
    const pooledStdError = Math.sqrt(
      (Math.pow(standardError1, 2) / n1) + (Math.pow(standardError2, 2) / n2)
    );
    
    const tStat = Math.abs(mean1 - mean2) / pooledStdError;
    
    // Calculate degrees of freedom using Welch-Satterthwaite equation
    const df = Math.pow(
      (Math.pow(standardError1, 2) / n1 + Math.pow(standardError2, 2) / n2),
      2
    ) / (
      Math.pow(Math.pow(standardError1, 2) / n1, 2) / (n1 - 1) +
      Math.pow(Math.pow(standardError2, 2) / n2, 2) / (n2 - 1)
    );
    
    // Approximate p-value using the normal distribution
    // This is a simplification. For a more accurate p-value, 
    // use a proper t-distribution calculation
    const pValue = 2 * (1 - this.normalCDF(tStat));
    
    return pValue;
  }

  /**
   * Calculates the cumulative distribution function of the standard normal distribution
   * 
   * @param x The value
   * @returns The CDF value
   */
  private static normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - probability : probability;
  }
}