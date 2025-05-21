#!/usr/bin/env node
// /Volumes/Envoy/SecondBrain/.cl/insights/query_insights.js
// Utility for querying insights in the strategy library

const fs = require('fs');
const path = require('path');

const STRATEGY_LIB_PATH = '/Volumes/Envoy/SecondBrain/strategy_library';
const INDEX_PATH = path.join(STRATEGY_LIB_PATH, '_index.json');

class InsightQuery {
  constructor() {
    if (!fs.existsSync(INDEX_PATH)) {
      throw new Error(`Index file not found at ${INDEX_PATH}`);
    }
    
    this.index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  }
  
  findByTag(tag, limit = 5) {
    if (!this.index.tags[tag]) {
      return [];
    }
    
    const insightIds = this.index.tags[tag].sort().reverse().slice(0, limit);
    return this.getInsightsByIds(insightIds);
  }
  
  findByPillar(pillar, limit = 5) {
    if (!this.index.pillars[pillar]) {
      return [];
    }
    
    const insightIds = this.index.pillars[pillar].sort().reverse().slice(0, limit);
    return this.getInsightsByIds(insightIds);
  }
  
  findByImpact(impact, limit = 5) {
    const matchingInsights = this.index.insights
      .filter(insight => insight.master_plan_impact === impact)
      .sort((a, b) => {
        // Sort by date (assuming ID format YYYY-MM-DD_*)
        const dateA = a.id.split('_')[0];
        const dateB = b.id.split('_')[0];
        return dateB.localeCompare(dateA);
      })
      .slice(0, limit);
    
    return matchingInsights.map(insight => ({
      id: insight.id,
      title: insight.title,
      summary: insight.summary,
      file_path: path.join(STRATEGY_LIB_PATH, insight.file_path)
    }));
  }
  
  search(query, limit = 5) {
    // Simple search based on title and summary
    const matchingInsights = this.index.insights
      .filter(insight => {
        const titleMatch = insight.title.toLowerCase().includes(query.toLowerCase());
        const summaryMatch = insight.summary.toLowerCase().includes(query.toLowerCase());
        return titleMatch || summaryMatch;
      })
      .sort((a, b) => {
        // Sort by date (assuming ID format YYYY-MM-DD_*)
        const dateA = a.id.split('_')[0];
        const dateB = b.id.split('_')[0];
        return dateB.localeCompare(dateA);
      })
      .slice(0, limit);
    
    return matchingInsights.map(insight => ({
      id: insight.id,
      title: insight.title,
      summary: insight.summary,
      file_path: path.join(STRATEGY_LIB_PATH, insight.file_path)
    }));
  }
  
  getInsightsByIds(insightIds) {
    return insightIds.map(id => {
      const insight = this.index.insights.find(i => i.id === id);
      if (!insight) return null;
      
      return {
        id: insight.id,
        title: insight.title,
        summary: insight.summary,
        file_path: path.join(STRATEGY_LIB_PATH, insight.file_path)
      };
    }).filter(Boolean);
  }
  
  getFullInsight(insightId) {
    const insight = this.index.insights.find(i => i.id === insightId);
    if (!insight) return null;
    
    const filePath = path.join(STRATEGY_LIB_PATH, insight.file_path);
    if (!fs.existsSync(filePath)) return null;
    
    return fs.readFileSync(filePath, 'utf8');
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const queryType = args[0];
  const queryValue = args[1];
  const limit = args[2] ? parseInt(args[2]) : 5;
  
  if (!queryType || !queryValue) {
    console.error('Usage: node query_insights.js <tag|pillar|impact|search|get> <value> [limit]');
    process.exit(1);
  }
  
  try {
    const insightQuery = new InsightQuery();
    let results;
    
    switch (queryType) {
      case 'tag':
        results = insightQuery.findByTag(queryValue, limit);
        break;
      case 'pillar':
        results = insightQuery.findByPillar(queryValue, limit);
        break;
      case 'impact':
        results = insightQuery.findByImpact(queryValue, limit);
        break;
      case 'search':
        results = insightQuery.search(queryValue, limit);
        break;
      case 'get':
        results = insightQuery.getFullInsight(queryValue);
        break;
      default:
        console.error('Unknown query type. Use tag, pillar, impact, search, or get.');
        process.exit(1);
    }
    
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = InsightQuery;