#!/usr/bin/env python3
"""
Smart Agent Router for Coding Tasks

This script analyzes coding tasks and recommends the best agent (Jules, Codex, or Claude)
based on task characteristics and historical performance data.
"""

import os
import json
import re
import argparse
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import sqlite3
from datetime import datetime

@dataclass
class TaskAnalysis:
    """Analysis of a coding task's characteristics"""
    task_id: str
    complexity: float  # 0-1 scale
    scope: str  # "single-file", "multi-file", "repo-wide"
    estimated_time: float  # minutes
    risk_level: str  # "low", "medium", "high"
    requires_async: bool
    requires_security_focus: bool
    requires_deep_refactor: bool
    requires_cross_file_analysis: bool
    language: str
    priority: str  # "low", "medium", "high"
    task_types: List[str]  # e.g., ["legacy", "security", "refactor"]

class PerformanceHistoryDB:
    """Database for tracking agent performance history"""
    
    def __init__(self, db_path: str = "agent_performance.db"):
        """Initialize the performance history database
        
        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = db_path
        self._initialize_db()
        
    def _initialize_db(self) -> None:
        """Create the database schema if it doesn't exist"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create tasks table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    complexity REAL NOT NULL,
                    scope TEXT NOT NULL,
                    language TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Create task_types table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS task_types (
                    task_id TEXT,
                    type_name TEXT,
                    PRIMARY KEY (task_id, type_name),
                    FOREIGN KEY (task_id) REFERENCES tasks(id)
                )
            ''')
            
            # Create agent_performance table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS agent_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    execution_time REAL NOT NULL,
                    test_pass_rate REAL NOT NULL,
                    quality_score REAL,
                    file_safety INTEGER NOT NULL,
                    error_handling INTEGER NOT NULL,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (task_id) REFERENCES tasks(id)
                )
            ''')
            
            conn.commit()
    
    def add_task(self, task_id: str, title: str, complexity: float, 
                scope: str, language: str, task_types: List[str]) -> None:
        """Add a new task to the database
        
        Args:
            task_id: Unique identifier for the task
            title: Task title
            complexity: Task complexity (0-1 scale)
            scope: Task scope ("single-file", "multi-file", "repo-wide")
            language: Programming language of the task
            task_types: List of task types
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Insert task
            cursor.execute('''
                INSERT OR REPLACE INTO tasks 
                (id, title, complexity, scope, language, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (task_id, title, complexity, scope, language, 
                 datetime.now().isoformat()))
            
            # Delete existing task types and insert new ones
            cursor.execute('DELETE FROM task_types WHERE task_id = ?', (task_id,))
            for task_type in task_types:
                cursor.execute('''
                    INSERT INTO task_types (task_id, type_name)
                    VALUES (?, ?)
                ''', (task_id, task_type))
            
            conn.commit()
    
    def add_performance(self, task_id: str, agent_name: str, execution_time: float,
                       test_pass_rate: float, quality_score: Optional[float] = None,
                       file_safety: bool = True, error_handling: bool = True) -> None:
        """Add performance data for an agent on a specific task
        
        Args:
            task_id: Task identifier
            agent_name: Name of the agent ("Jules", "Codex", "Claude")
            execution_time: Time to complete the task (seconds)
            test_pass_rate: Percentage of tests passed (0-1)
            quality_score: Code quality score (0-1) if available
            file_safety: Whether the agent handled files safely
            error_handling: Whether the agent handled errors properly
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO agent_performance
                (task_id, agent_name, execution_time, test_pass_rate, 
                quality_score, file_safety, error_handling, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (task_id, agent_name, execution_time, test_pass_rate,
                 quality_score, int(file_safety), int(error_handling),
                 datetime.now().isoformat()))
            
            conn.commit()
    
    def get_agent_performance(self, task_types: List[str], 
                            language: Optional[str] = None) -> Dict[str, Dict[str, float]]:
        """Get agent performance for tasks with specific types
        
        Args:
            task_types: List of task types to filter by
            language: Optional programming language to filter by
            
        Returns:
            Dict mapping agent names to performance metrics
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Build query based on task types and language
            task_filter = "WHERE tt.type_name IN ({})".format(
                ",".join(["?"] * len(task_types)))
            
            params = task_types.copy()
            if language:
                task_filter += " AND t.language = ?"
                params.append(language)
                
            # Build the final query
            query = f'''
                SELECT ap.agent_name,
                       AVG(ap.execution_time) as avg_execution_time,
                       AVG(ap.test_pass_rate) as avg_test_pass_rate,
                       AVG(ap.quality_score) as avg_quality_score,
                       AVG(ap.file_safety) as avg_file_safety,
                       AVG(ap.error_handling) as avg_error_handling,
                       COUNT(*) as task_count
                FROM agent_performance ap
                JOIN tasks t ON ap.task_id = t.id
                JOIN task_types tt ON t.id = tt.task_id
                {task_filter}
                GROUP BY ap.agent_name
            '''
            
            cursor.execute(query, params)
            results = {}
            
            for row in cursor.fetchall():
                agent_name = row['agent_name']
                results[agent_name] = {
                    'avg_execution_time': row['avg_execution_time'],
                    'avg_test_pass_rate': row['avg_test_pass_rate'],
                    'avg_quality_score': row['avg_quality_score'],
                    'avg_file_safety': row['avg_file_safety'],
                    'avg_error_handling': row['avg_error_handling'],
                    'task_count': row['task_count']
                }
                
            return results

class SmartAgentRouter:
    """Intelligent router for selecting the best coding agent for each task"""
    
    def __init__(self, config_path: str = "config.json", 
                db_path: str = "agent_performance.db"):
        """Initialize the smart agent router
        
        Args:
            config_path: Path to configuration file
            db_path: Path to performance history database
        """
        # Load configuration
        with open(config_path, 'r') as f:
            self.config = json.load(f)
            
        # Initialize performance history
        self.history = PerformanceHistoryDB(db_path)
        
    def analyze_task(self, task_spec: Dict[str, Any]) -> TaskAnalysis:
        """Analyze a task to determine its characteristics
        
        Args:
            task_spec: Task specification
            
        Returns:
            TaskAnalysis with task characteristics
        """
        # Extract basic information
        task_id = task_spec.get('title', '').lower().replace(' ', '_')
        file_path = task_spec.get('file', '')
        description = task_spec.get('description', '')
        criteria = task_spec.get('criteria', [])
        
        # Determine language from file extension
        language = 'unknown'
        if isinstance(file_path, str) and '.' in file_path:
            ext = file_path.split('.')[-1].lower()
            language_map = {
                'py': 'python',
                'js': 'javascript',
                'ts': 'typescript',
                'java': 'java',
                'c': 'c',
                'cpp': 'cpp',
                'cs': 'csharp',
                'go': 'go',
                'rb': 'ruby',
                'php': 'php',
                'rs': 'rust',
                'swift': 'swift'
            }
            language = language_map.get(ext, 'unknown')
        
        # Determine scope
        scope = 'single-file'
        if isinstance(file_path, list) and len(file_path) > 1:
            scope = 'multi-file'
        if any(keyword in description.lower() for keyword in 
              ['repo', 'repository', 'codebase', 'across files']):
            scope = 'repo-wide'
            
        # Identify task types
        task_types = []
        
        # Check for legacy/refactoring tasks
        if any(keyword in description.lower() for keyword in 
              ['refactor', 'legacy', 'deprecated', 'update', 'replace']):
            task_types.append('legacy')
            
        # Check for security tasks
        if any(keyword in description.lower() or any(keyword in criterion.lower() for criterion in criteria) 
              for keyword in ['security', 'auth', 'validation', 'sanitize', 'vulnerability']):
            task_types.append('security')
            
        # Check for async requirements
        requires_async = any(keyword in description.lower() 
                           for keyword in ['async', 'asynchronous', 'concurrent'])
        if requires_async:
            task_types.append('async')
            
        # Check for deep refactoring
        requires_deep_refactor = any(keyword in description.lower() 
                                   for keyword in ['rewrite', 'restructure', 'redesign'])
        if requires_deep_refactor:
            task_types.append('deep_refactor')
            
        # Check for cross-file analysis
        requires_cross_file = scope != 'single-file' or any(keyword in description.lower() 
                                                         for keyword in ['dependencies', 'imports', 'across files'])
        if requires_cross_file:
            task_types.append('cross_file')
            
        # Calculate complexity (simple heuristic)
        complexity_factors = {
            'single-file': 0.3,
            'multi-file': 0.6,
            'repo-wide': 0.9
        }
        
        base_complexity = complexity_factors.get(scope, 0.3)
        
        # Adjust for other factors
        if requires_async:
            base_complexity += 0.2
        if requires_deep_refactor:
            base_complexity += 0.2
        if 'security' in task_types:
            base_complexity += 0.1
            
        # Cap at 1.0
        complexity = min(base_complexity, 1.0)
        
        # Determine risk level
        risk_level = 'low'
        if 'security' in task_types or scope == 'repo-wide':
            risk_level = 'high'
        elif complexity > 0.5:
            risk_level = 'medium'
            
        # Estimate time (minutes)
        estimated_time = complexity * 60  # 0-60 minutes based on complexity
        
        # Determine priority
        priority = 'medium'
        if risk_level == 'high':
            priority = 'high'
        elif complexity < 0.3:
            priority = 'low'
            
        return TaskAnalysis(
            task_id=task_id,
            complexity=complexity,
            scope=scope,
            estimated_time=estimated_time,
            risk_level=risk_level,
            requires_async=requires_async,
            requires_security_focus='security' in task_types,
            requires_deep_refactor=requires_deep_refactor,
            requires_cross_file_analysis=requires_cross_file,
            language=language,
            priority=priority,
            task_types=task_types
        )
    
    def select_agent(self, task_spec: Dict[str, Any], 
                    use_historical_data: bool = True) -> Tuple[str, Dict[str, Any]]:
        """Select the best agent for a given task
        
        Args:
            task_spec: Task specification
            use_historical_data: Whether to consider historical performance data
            
        Returns:
            Tuple of (agent_name, reasoning_data)
        """
        # Analyze the task
        analysis = self.analyze_task(task_spec)
        
        # Default rule-based recommendation
        rule_based_recommendation = self._rule_based_selection(analysis)
        
        reasoning = {
            "task_analysis": vars(analysis),
            "rule_based_recommendation": rule_based_recommendation,
            "historical_data": None,
            "final_recommendation": rule_based_recommendation,
            "confidence": 0.7  # Default confidence
        }
        
        # If historical data should be used, check past performance
        if use_historical_data and analysis.task_types:
            try:
                historical_performance = self.history.get_agent_performance(
                    analysis.task_types, analysis.language)
                
                if historical_performance:
                    historical_recommendation, confidence = self._historical_data_selection(
                        historical_performance, analysis)
                    
                    reasoning["historical_data"] = historical_performance
                    reasoning["historical_recommendation"] = historical_recommendation
                    reasoning["historical_confidence"] = confidence
                    
                    # Determine final recommendation based on confidence
                    if confidence > 0.7:  # Threshold for preferring historical data
                        reasoning["final_recommendation"] = historical_recommendation
                        reasoning["confidence"] = confidence
                    else:
                        reasoning["confidence"] = 0.7  # Using rule-based with default confidence
            except Exception as e:
                # If there's an error with historical data, fall back to rule-based
                reasoning["historical_error"] = str(e)
        
        return reasoning["final_recommendation"], reasoning
    
    def _rule_based_selection(self, analysis: TaskAnalysis) -> str:
        """Rule-based selection of the best agent
        
        Args:
            analysis: Task analysis
            
        Returns:
            Name of the recommended agent
        """
        # Jules is best for complex, multi-file, deep refactoring tasks
        if (analysis.scope in ['multi-file', 'repo-wide'] or 
            analysis.requires_deep_refactor or 
            'legacy' in analysis.task_types or
            'cross_file' in analysis.task_types):
            return "Jules"
            
        # Claude is best for security-focused tasks
        if (analysis.requires_security_focus or
            analysis.risk_level == 'high' or
            'security' in analysis.task_types):
            return "Claude"
            
        # Default to Codex for most other tasks
        return "Codex"
    
    def _historical_data_selection(self, performance_data: Dict[str, Dict[str, float]],
                                 analysis: TaskAnalysis) -> Tuple[str, float]:
        """Select the best agent based on historical performance
        
        Args:
            performance_data: Historical performance data for each agent
            analysis: Task analysis
            
        Returns:
            Tuple of (agent_name, confidence)
        """
        if not performance_data:
            return "Codex", 0.5  # Default with low confidence
            
        # Create a score for each agent based on the task characteristics
        scores = {}
        
        for agent, metrics in performance_data.items():
            # Skip agents with too little data
            if metrics['task_count'] < 3:
                continue
                
            # Base score is test pass rate (0-1 scale)
            score = metrics['avg_test_pass_rate']
            
            # Adjust for execution time (faster is better)
            # Normalize execution time to 0-1 scale where 1 is fastest
            times = [perf['avg_execution_time'] for perf in performance_data.values()]
            if times:
                min_time = min(times)
                max_time = max(times)
                time_range = max_time - min_time
                
                if time_range > 0:
                    normalized_time = 1 - ((metrics['avg_execution_time'] - min_time) / time_range)
                    score += normalized_time * 0.3  # 30% weight for speed
                
            # Adjust for code quality if available
            if metrics['avg_quality_score'] is not None:
                score += metrics['avg_quality_score'] * 0.3  # 30% weight for quality
                
            # Adjust for safety for high risk tasks
            if analysis.risk_level == 'high':
                score += metrics['avg_file_safety'] * 0.2  # 20% weight for safety
                
            scores[agent] = score
            
        # Find the agent with the highest score
        if not scores:
            return "Codex", 0.5  # Default with low confidence
            
        best_agent = max(scores.items(), key=lambda x: x[1])
        
        # Calculate confidence based on score difference and data amount
        if len(scores) > 1:
            # Sort scores in descending order
            sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
            best_score = sorted_scores[0][1]
            second_best_score = sorted_scores[1][1]
            
            # Confidence is proportional to the gap between best and second best
            score_gap = best_score - second_best_score
            confidence = min(0.5 + score_gap, 0.95)  # 0.5-0.95 range
            
            # Adjust confidence based on amount of data
            best_agent_data = performance_data[best_agent[0]]
            confidence *= min(best_agent_data['task_count'] / 10, 1.0)  # Scale by task count up to 10
            
            return best_agent[0], confidence
        else:
            # Only one agent has data
            return best_agent[0], 0.6  # Moderate confidence
    
    def update_performance(self, task_spec: Dict[str, Any], 
                         agent_results: Dict[str, Dict[str, Any]]) -> None:
        """Update performance history with new benchmark results
        
        Args:
            task_spec: Task specification
            agent_results: Results for each agent
        """
        # Analyze task to get metadata
        analysis = self.analyze_task(task_spec)
        
        # Add task to the database
        self.history.add_task(
            task_id=analysis.task_id,
            title=task_spec.get('title', ''),
            complexity=analysis.complexity,
            scope=analysis.scope,
            language=analysis.language,
            task_types=analysis.task_types
        )
        
        # Add performance data for each agent
        for agent_name, result in agent_results.items():
            self.history.add_performance(
                task_id=analysis.task_id,
                agent_name=agent_name,
                execution_time=result.get('execution_time', 0),
                test_pass_rate=result.get('test_pass_rate', 0),
                quality_score=result.get('quality_score'),
                file_safety=result.get('file_safety', True),
                error_handling=result.get('error_handling', True)
            )

def main():
    parser = argparse.ArgumentParser(description="Smart Agent Router for AI Coding Tasks")
    parser.add_argument('--task', type=str, help='Path to task specification JSON file')
    parser.add_argument('--config', type=str, default='config.json', 
                      help='Path to configuration file (default: config.json)')
    parser.add_argument('--history', action='store_true', 
                      help='Use historical performance data if available')
    parser.add_argument('--analyze-only', action='store_true',
                      help='Only analyze the task, don\'t select an agent')
    parser.add_argument('--format', choices=['text', 'json'], default='text',
                      help='Output format (default: text)')
    
    args = parser.parse_args()
    
    if not args.task:
        parser.print_help()
        return 1
    
    # Load task specification
    with open(args.task, 'r') as f:
        task_spec = json.load(f)
    
    # Initialize router
    router = SmartAgentRouter(args.config)
    
    # Analyze the task
    analysis = router.analyze_task(task_spec)
    
    if args.analyze_only:
        if args.format == 'json':
            print(json.dumps(vars(analysis), indent=2))
        else:
            print("Task Analysis:")
            print(f"  Task ID: {analysis.task_id}")
            print(f"  Complexity: {analysis.complexity:.2f}")
            print(f"  Scope: {analysis.scope}")
            print(f"  Language: {analysis.language}")
            print(f"  Risk Level: {analysis.risk_level}")
            print(f"  Estimated Time: {analysis.estimated_time:.1f} minutes")
            print(f"  Task Types: {', '.join(analysis.task_types)}")
            print(f"  Requires Async: {analysis.requires_async}")
            print(f"  Requires Security Focus: {analysis.requires_security_focus}")
            print(f"  Requires Deep Refactor: {analysis.requires_deep_refactor}")
            print(f"  Requires Cross-File Analysis: {analysis.requires_cross_file_analysis}")
            print(f"  Priority: {analysis.priority}")
    else:
        # Select the best agent
        agent, reasoning = router.select_agent(task_spec, use_historical_data=args.history)
        
        if args.format == 'json':
            print(json.dumps({
                'recommended_agent': agent,
                'reasoning': reasoning
            }, indent=2))
        else:
            print("Smart Agent Recommendation:")
            print(f"  Recommended Agent: {agent}")
            print(f"  Confidence: {reasoning.get('confidence', 0):.2f}")
            print("\nTask Characteristics:")
            print(f"  Complexity: {analysis.complexity:.2f}")
            print(f"  Scope: {analysis.scope}")
            print(f"  Risk Level: {analysis.risk_level}")
            print(f"  Task Types: {', '.join(analysis.task_types)}")
            
            if reasoning.get('historical_data'):
                print("\nHistorical Performance Data Used:")
                print("  This recommendation includes analysis of past performance")
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())