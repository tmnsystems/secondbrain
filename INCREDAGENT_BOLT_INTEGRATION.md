# IncredAgent + Bolt Integration Plan

## Overview

This implementation plan outlines how we'll expand the IncredAgent system by integrating it with Bolt and extending our existing LangGraph implementations to create a powerful business agents ecosystem for SecondBrain. This integration will leverage Bolt's development environment, our existing LangGraph workflows, and enhance IncredAgent's business strategy functionality.

## Goals

1. Create a seamless integration between IncredAgent and Bolt.diy
2. Extend existing LangGraph workflows for business intelligence
3. Add document processing capabilities to the system
4. Build a human-in-the-loop feedback mechanism
5. Connect to the modern web interface for IncredAgent interactions

## Architecture Components

### 1. Bolt Integration Layer

The Bolt integration layer will connect IncredAgent with Bolt.diy, enabling:
- Code generation for business applications
- Execution of business logic through Bolt's runtime
- Access to Bolt's model flexibility for different tasks

**Components:**
- `BoltAgent` class for IncredAgent system
- API bridge for communication between systems
- Authentication and security layer

### 2. Document Processing System

A new document processor will enhance IncredAgent's ability to:
- Parse different file formats (PDF, DOCX, TXT, MD, etc.)
- Extract structured data from unstructured content
- Provide context for business decisions
- Feed content into the strategy development process

**Components:**
- `DocumentProcessor` class with format-specific parsers
- Vectorization for semantic search
- Metadata extraction for classification

### 3. Enhanced Feedback System

Building on the existing feedback system for human-in-the-loop review:
- Collect evaluations of generated content and strategies
- Recommend improvements to the system based on feedback
- Track quality metrics over time
- Guide model parameter adjustments

**Components:**
- Integration with existing feedback collection
- Enhanced recommendation engine
- Extended quality monitoring system

## Implementation Path

### Phase 1: BoltAgent Integration (Week 1)

First, we'll create the BoltAgent class that will serve as the interface between IncredAgent and Bolt.diy:

```python
# /apps/CoachTinaMarieAI/incredagent_smaller/incredagent_core/api_integrations/bolt/client.py

from typing import Dict, Any, List, Optional, Union
import os
import json
import requests
from pydantic import BaseModel, Field

class BoltRequest(BaseModel):
    prompt: str = Field(..., description="Prompt for Bolt to process")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    model: Optional[str] = Field(default=None, description="Model to use for generation")
    mode: str = Field(default="code", description="Operation mode (code, content, deployment)")

class BoltResponse(BaseModel):
    content: str = Field(..., description="Generated content")
    model_used: str = Field(..., description="Model used for generation")
    execution_info: Optional[Dict[str, Any]] = Field(default=None, description="Execution information")
    metadata: Dict[str, Any] = Field(default_factory=dict)

class BoltClient:
    """Client for interacting with Bolt.diy through the API bridge."""
    
    def __init__(self, api_url: str = None, api_key: str = None):
        """Initialize the Bolt client.
        
        Args:
            api_url: URL for the Bolt API bridge (default: from environment)
            api_key: API key for authorization (default: from environment)
        """
        self.api_url = api_url or os.environ.get("BOLT_API_URL", "http://localhost:3030/api")
        self.api_key = api_key or os.environ.get("BOLT_API_KEY")
        self.headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
    
    def generate_code(self, prompt: str, context: Dict[str, Any] = None) -> BoltResponse:
        """Generate code using Bolt.diy.
        
        Args:
            prompt: Prompt for code generation
            context: Additional context (optional)
            
        Returns:
            Generated code and metadata
        """
        request = BoltRequest(
            prompt=prompt,
            context=context,
            mode="code"
        )
        
        return self._make_request("/generate-code", request)
    
    def generate_content(self, prompt: str, context: Dict[str, Any] = None, 
                        model: str = None) -> BoltResponse:
        """Generate content using Bolt.diy.
        
        Args:
            prompt: Prompt for content generation
            context: Additional context (optional)
            model: Model to use (optional)
            
        Returns:
            Generated content and metadata
        """
        request = BoltRequest(
            prompt=prompt,
            context=context,
            model=model,
            mode="content"
        )
        
        return self._make_request("/generate-content", request)
    
    def deploy_project(self, project_path: str, deployment_target: str,
                      config: Dict[str, Any] = None) -> BoltResponse:
        """Deploy a project using Bolt.diy.
        
        Args:
            project_path: Path to the project
            deployment_target: Target platform (vercel, netlify, etc.)
            config: Deployment configuration (optional)
            
        Returns:
            Deployment result and metadata
        """
        request = BoltRequest(
            prompt=f"Deploy {project_path} to {deployment_target}",
            context={
                "project_path": project_path,
                "deployment_target": deployment_target,
                "config": config or {}
            },
            mode="deployment"
        )
        
        return self._make_request("/deploy", request)
    
    def _make_request(self, endpoint: str, request: BoltRequest) -> BoltResponse:
        """Make a request to the Bolt API bridge.
        
        Args:
            endpoint: API endpoint
            request: Request data
            
        Returns:
            Response from the API
            
        Raises:
            Exception: If the request fails
        """
        try:
            response = requests.post(
                f"{self.api_url}{endpoint}",
                headers=self.headers,
                json=request.dict(),
                timeout=60
            )
            
            response.raise_for_status()
            data = response.json()
            
            return BoltResponse(**data)
        except Exception as e:
            error_message = f"Error calling Bolt API: {str(e)}"
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                error_message += f"\nResponse: {e.response.text}"
            raise Exception(error_message)
```

### Phase 2: Document Processor Implementation (Week 1-2)

We'll create the DocumentProcessor class to handle various file formats:

```python
# /apps/CoachTinaMarieAI/incredagent_smaller/incredagent_core/api_integrations/document_processor/processor.py

import os
import re
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Tuple
from datetime import datetime
from pydantic import BaseModel, Field

# Optional imports for specific file types
try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False

logger = logging.getLogger(__name__)


class ProcessedDocument(BaseModel):
    """Model representing a processed document."""
    
    filename: str
    file_path: Optional[str] = None
    file_type: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    sections: List[Dict[str, Any]] = Field(default_factory=list)
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    processed_at: datetime = Field(default_factory=datetime.now)


class DocumentProcessor:
    """Process documents of various formats for content extraction and analysis."""
    
    def __init__(self):
        """Initialize the document processor."""
        self.supported_extensions = {
            ".txt": self._process_text,
            ".md": self._process_markdown,
            ".docx": self._process_docx,
            ".pdf": self._process_pdf,
            ".json": self._process_json,
            ".html": self._process_html,
            ".htm": self._process_html,
        }
    
    def process_document(self, file_path: str) -> ProcessedDocument:
        """Process a document file.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            ProcessedDocument object containing extracted content and metadata
            
        Raises:
            ValueError: If file format is not supported
            FileNotFoundError: If file doesn't exist
        """
        # Validate file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Get file extension
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        
        # Check if extension is supported
        if ext not in self.supported_extensions:
            raise ValueError(f"Unsupported file format: {ext}")
        
        # Get file name
        filename = os.path.basename(file_path)
        
        # Process the document based on file type
        processor_func = self.supported_extensions[ext]
        content, metadata, sections = processor_func(file_path)
        
        # Basic metadata
        if "file_size" not in metadata:
            metadata["file_size"] = os.path.getsize(file_path)
        if "created_at" not in metadata:
            metadata["created_at"] = datetime.fromtimestamp(
                os.path.getctime(file_path)
            ).isoformat()
        if "modified_at" not in metadata:
            metadata["modified_at"] = datetime.fromtimestamp(
                os.path.getmtime(file_path)
            ).isoformat()
        
        # Create processed document
        processed_doc = ProcessedDocument(
            filename=filename,
            file_path=file_path,
            file_type=ext.replace(".", ""),
            content=content,
            metadata=metadata,
            sections=sections
        )
        
        return processed_doc

    # Process functions for different file types (same as in previous implementation)
    def _process_text(self, file_path: str) -> Tuple[str, Dict[str, Any], List[Dict[str, Any]]]:
        """Process a plain text file."""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Basic metadata
        metadata = {
            "line_count": len(content.splitlines()),
            "char_count": len(content),
            "word_count": len(content.split())
        }
        
        # Extract sections (using empty lines as separators)
        sections = []
        current_section = ""
        for line in content.splitlines():
            if not line.strip() and current_section:
                # Identify potential section titles
                lines = current_section.splitlines()
                title = lines[0] if lines else ""
                content = "\n".join(lines[1:]) if len(lines) > 1 else ""
                
                sections.append({
                    "title": title,
                    "content": content
                })
                current_section = ""
            else:
                current_section += line + "\n"
        
        # Add the last section
        if current_section.strip():
            lines = current_section.splitlines()
            title = lines[0] if lines else ""
            content = "\n".join(lines[1:]) if len(lines) > 1 else ""
            
            sections.append({
                "title": title,
                "content": content
            })
        
        return content, metadata, sections
    
    # Additional processing functions for other file types would be implemented here

    def extract_data(self, processed_doc: ProcessedDocument, data_patterns: Dict[str, str]) -> Dict[str, Any]:
        """Extract structured data from processed document using regex patterns.
        
        Args:
            processed_doc: ProcessedDocument object
            data_patterns: Dictionary of field_name: regex_pattern
            
        Returns:
            Dictionary of extracted data
        """
        extracted_data = {}
        
        for field_name, pattern in data_patterns.items():
            matches = re.finditer(pattern, processed_doc.content, re.MULTILINE)
            
            # Check for the type of match we're expecting
            if pattern.endswith("$"):  # Single match expected
                match = re.search(pattern, processed_doc.content, re.MULTILINE)
                if match:
                    if len(match.groups()) > 0:
                        extracted_data[field_name] = match.group(1)
                    else:
                        extracted_data[field_name] = match.group(0)
            else:  # Multiple matches
                matches = re.finditer(pattern, processed_doc.content, re.MULTILINE)
                extracted_items = []
                
                for match in matches:
                    if len(match.groups()) > 0:
                        extracted_items.append(match.group(1))
                    else:
                        extracted_items.append(match.group(0))
                
                if extracted_items:
                    extracted_data[field_name] = extracted_items
        
        # Update the processed document
        processed_doc.extracted_data.update(extracted_data)
        
        return extracted_data
```

### Phase 3: LangGraph Integration for Document Flow (Week 2)

Create a document processing workflow using LangGraph:

```python
# /apps/CoachTinaMarieAI/incredagent_smaller/incredagent_core/workflows/document_processing.py

from typing import Dict, Any, List, Optional
import sys
import os
import asyncio
from pydantic import BaseModel, Field
import langgraph.graph as lg
from langgraph.graph import StateGraph

from incredagent.api_integrations.document_processor.processor import DocumentProcessor, ProcessedDocument
from incredagent.agents.llm_agent import LLMAgent
from incredagent.agents.base_agent import BaseAgent, AgentState

class DocumentProcessingState(BaseModel):
    """State for document processing workflow."""
    
    file_path: str = Field(..., description="Path to the document file")
    file_type: Optional[str] = Field(default=None, description="File type")
    processed_document: Optional[ProcessedDocument] = Field(default=None, description="Processed document data")
    content_summary: Optional[str] = Field(default=None, description="Summary of the document content")
    extracted_insights: Optional[Dict[str, Any]] = Field(default=None, description="Extracted insights")
    error: Optional[str] = Field(default=None, description="Error message if processing failed")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Final processing result")

class DocumentProcessingWorkflow:
    """Workflow for processing documents with LLM-enhanced analysis."""
    
    def __init__(self):
        """Initialize the document processing workflow."""
        self.document_processor = DocumentProcessor()
        self.llm_agent = LLMAgent()
        self.workflow = self.build_workflow()
        
    def build_workflow(self) -> StateGraph:
        """Build the document processing workflow."""
        # Create the workflow
        workflow = StateGraph(DocumentProcessingState)
        
        # Add nodes
        workflow.add_node("process_document", self.process_document_node)
        workflow.add_node("generate_summary", self.generate_summary_node)
        workflow.add_node("extract_insights", self.extract_insights_node)
        workflow.add_node("create_result", self.create_result_node)
        
        # Add edges
        workflow.add_edge("process_document", "generate_summary")
        workflow.add_edge("generate_summary", "extract_insights")
        workflow.add_edge("extract_insights", "create_result")
        
        # Set entry point
        workflow.set_entry_point("process_document")
        
        return workflow.compile()
    
    async def process_document_node(self, state: DocumentProcessingState) -> DocumentProcessingState:
        """Process the document using the document processor."""
        try:
            # Process the document
            processed_doc = self.document_processor.process_document(state.file_path)
            
            # Update state
            return DocumentProcessingState(
                file_path=state.file_path,
                file_type=processed_doc.file_type,
                processed_document=processed_doc
            )
        except Exception as e:
            # Handle errors
            return DocumentProcessingState(
                file_path=state.file_path,
                error=f"Error processing document: {str(e)}"
            )
    
    async def generate_summary_node(self, state: DocumentProcessingState) -> DocumentProcessingState:
        """Generate a summary of the document content."""
        if state.error or not state.processed_document:
            return state
        
        try:
            # Generate summary using LLM
            prompt = f"""
            You are an AI assistant specialized in summarizing documents.
            Please provide a concise summary of the following document content.
            Focus on the key points, main arguments, and important information.
            Keep the summary to 3-5 paragraphs maximum.
            
            Document content:
            {state.processed_document.content[:4000]}  # Limit content size
            """
            
            # Use LLM to generate summary
            llm_result = await self.llm_agent.run({"content": prompt})
            summary = llm_result.get("content", "")
            
            # Update state
            return DocumentProcessingState(
                file_path=state.file_path,
                file_type=state.file_type,
                processed_document=state.processed_document,
                content_summary=summary
            )
        except Exception as e:
            # Handle errors
            return DocumentProcessingState(
                file_path=state.file_path,
                file_type=state.file_type,
                processed_document=state.processed_document,
                error=f"Error generating summary: {str(e)}"
            )
    
    async def extract_insights_node(self, state: DocumentProcessingState) -> DocumentProcessingState:
        """Extract insights from the document content."""
        if state.error or not state.processed_document:
            return state
        
        try:
            # Extract insights using LLM
            prompt = f"""
            You are an AI assistant specialized in business document analysis.
            Please extract key business insights from the following document.
            Identify:
            1. Strategic elements (objectives, goals, strategies)
            2. Key stakeholders and roles
            3. Action items and timelines
            4. Resource requirements
            5. Critical success factors
            
            Document content:
            {state.processed_document.content[:4000]}  # Limit content size
            
            Document summary:
            {state.content_summary}
            """
            
            # Use LLM to extract insights
            llm_result = await self.llm_agent.run({"content": prompt})
            insights_text = llm_result.get("content", "")
            
            # Parse insights into structured format
            insights = {
                "strategic_elements": [],
                "stakeholders": [],
                "action_items": [],
                "resources": [],
                "success_factors": [],
                "raw_analysis": insights_text
            }
            
            # Update state
            return DocumentProcessingState(
                file_path=state.file_path,
                file_type=state.file_type,
                processed_document=state.processed_document,
                content_summary=state.content_summary,
                extracted_insights=insights
            )
        except Exception as e:
            # Handle errors
            return DocumentProcessingState(
                file_path=state.file_path,
                file_type=state.file_type,
                processed_document=state.processed_document,
                content_summary=state.content_summary,
                error=f"Error extracting insights: {str(e)}"
            )
    
    async def create_result_node(self, state: DocumentProcessingState) -> DocumentProcessingState:
        """Create the final processing result."""
        if state.error:
            return state
        
        # Create result
        result = {
            "file_info": {
                "file_path": state.file_path,
                "file_type": state.file_type,
                "file_size": state.processed_document.metadata.get("file_size"),
                "metadata": state.processed_document.metadata
            },
            "content": {
                "summary": state.content_summary,
                "sections": state.processed_document.sections,
                "extracted_data": state.processed_document.extracted_data
            },
            "analysis": {
                "insights": state.extracted_insights,
                "recommendations": []  # Could be populated in a future node
            }
        }
        
        # Update state
        return DocumentProcessingState(
            file_path=state.file_path,
            file_type=state.file_type,
            processed_document=state.processed_document,
            content_summary=state.content_summary,
            extracted_insights=state.extracted_insights,
            result=result
        )
    
    async def process_document(self, file_path: str) -> Dict[str, Any]:
        """Process a document through the workflow.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Processing result
        """
        # Create initial state
        initial_state = DocumentProcessingState(file_path=file_path)
        
        # Run the workflow
        final_state = await self.workflow.invoke(initial_state)
        
        # Return result
        if final_state.error:
            return {"status": "error", "error": final_state.error}
        
        return {"status": "success", "result": final_state.result}
```

### Phase 4: Extending IncredAgent Integration (Week 2-3)

Enhance the main IncredAgent integration:

```python
# /apps/ai-writing-system/incredagent_integration.py (Updated)

import os
import sys
import argparse
import json
import time
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Import agent systems
from agent_framework import AgentSystem
from content_strategy_agents import ContentStrategyCluster
from content_creation_agents import ContentCreationCluster
from business_strategy_agents import BusinessStrategyCluster

# Import new components
from incredagent_core.api_integrations.bolt.client import BoltClient
from incredagent_core.api_integrations.document_processor.processor import DocumentProcessor
from incredagent_core.workflows.document_processing import DocumentProcessingWorkflow

# Load environment variables
load_dotenv()

class IncredAgentSystem:
    """
    Enhanced integration class for IncredAgent that combines content creation, 
    business strategy, document processing, and Bolt integration.
    """
    
    def __init__(self):
        """Initialize the IncredAgent integrated system."""
        self.agent_system = AgentSystem("IncredAgent")
        
        # Initialize all agent clusters
        self.setup_agent_clusters()
        
        # Initialize auxiliary components
        self.bolt_client = BoltClient()
        self.document_processor = DocumentProcessor()
        self.document_workflow = DocumentProcessingWorkflow()
        
        # Track processing metrics
        self.metrics = {
            "requests_processed": 0,
            "content_generated": 0,
            "strategies_developed": 0,
            "documents_processed": 0,
            "code_generated": 0,
            "processing_time": 0
        }
    
    def setup_agent_clusters(self):
        """Set up all agent clusters for the system."""
        # Content Strategy Cluster
        content_strategy_cluster = ContentStrategyCluster()
        self.agent_system.add_cluster(content_strategy_cluster)
        
        # Content Creation Cluster
        content_creation_cluster = ContentCreationCluster()
        self.agent_system.add_cluster(content_creation_cluster)
        
        # Business Strategy Cluster
        business_strategy_cluster = BusinessStrategyCluster()
        self.agent_system.add_cluster(business_strategy_cluster)
    
    async def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Process a document using the document processing workflow.
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Processing result
        """
        start_time = time.time()
        
        result = await self.document_workflow.process_document(file_path)
        
        # Update metrics
        self.metrics["requests_processed"] += 1
        self.metrics["documents_processed"] += 1
        self.metrics["processing_time"] += (time.time() - start_time)
        
        return result
    
    async def generate_code(self, prompt: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate code using Bolt.diy.
        
        Args:
            prompt: Prompt for code generation
            context: Additional context (optional)
            
        Returns:
            Generated code and metadata
        """
        start_time = time.time()
        
        response = self.bolt_client.generate_code(prompt, context)
        
        # Update metrics
        self.metrics["requests_processed"] += 1
        self.metrics["code_generated"] += 1
        self.metrics["processing_time"] += (time.time() - start_time)
        
        return {
            "status": "success",
            "content": response.content,
            "model_used": response.model_used,
            "metadata": response.metadata
        }

    # Add the existing methods (generate_content, generate_business_strategy, etc.)

    async def document_based_strategy(self, document_path: str, industry: str, 
                                     business_model: str) -> Dict[str, Any]:
        """
        Generate a business strategy based on document analysis.
        
        Args:
            document_path: Path to the document file
            industry: Industry for the business strategy
            business_model: Business model type
            
        Returns:
            Generated strategy based on document analysis
        """
        start_time = time.time()
        
        # Step 1: Process the document
        document_result = await self.process_document(document_path)
        
        if document_result["status"] != "success":
            self.metrics["requests_processed"] += 1
            self.metrics["processing_time"] += (time.time() - start_time)
            return document_result
        
        # Step 2: Extract relevant information for strategy development
        document_insights = document_result["result"]["analysis"]["insights"]
        document_summary = document_result["result"]["content"]["summary"]
        
        # Step 3: Generate strategy with document context
        additional_parameters = {
            "document_insights": document_insights,
            "document_summary": document_summary
        }
        
        strategy_results = await self.generate_business_strategy(
            industry, business_model, additional_parameters
        )
        
        # Update metrics
        self.metrics["processing_time"] += (time.time() - start_time)
        
        # Combine results
        return {
            "status": "success",
            "document_analysis": document_result["result"],
            "business_strategy": strategy_results,
            "processing_time": time.time() - start_time
        }

    async def code_implementation(self, strategy_result: Dict[str, Any], 
                                tech_stack: str) -> Dict[str, Any]:
        """
        Generate code implementation based on business strategy.
        
        Args:
            strategy_result: Business strategy result
            tech_stack: Technology stack to use
            
        Returns:
            Generated code implementation
        """
        start_time = time.time()
        
        # Extract key strategic elements
        strategic_plan = strategy_result.get("agent_results", {}).get(
            "StrategicPlanningAgent", {}).get("strategic_plan", {})
        
        # Create implementation prompt
        prompt = f"""
        Create a code implementation for a {tech_stack} application that implements
        the following business strategy:
        
        Strategic Focus: {strategic_plan.get("executive_summary", {}).get("core_strategy", "")}
        
        Target Audience: {strategic_plan.get("strategic_positioning", {}).get("target_segments", {}).get("primary", "")}
        
        Key Features Needed:
        1. {strategic_plan.get("growth_strategy", {}).get("phase_1_years_1_2", {}).get("focus", "")}
        2. {strategic_plan.get("strategic_positioning", {}).get("differentiation_factors", [""])[0]}
        3. Customer management and analytics
        
        The implementation should include:
        - Main application structure
        - Key components/modules
        - Database models
        - API endpoints
        - Business logic for core features
        """
        
        # Generate code using Bolt
        code_result = await self.generate_code(prompt, {
            "strategy": strategy_result,
            "tech_stack": tech_stack
        })
        
        # Update metrics
        self.metrics["processing_time"] += (time.time() - start_time)
        
        # Combine results
        return {
            "status": "success",
            "business_strategy": strategy_result,
            "code_implementation": code_result,
            "tech_stack": tech_stack,
            "processing_time": time.time() - start_time
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Return the current processing metrics."""
        return self.metrics
```

### Phase 5: Command Line Interface Extensions (Week 3)

Extend the main CLI to support new functionalities:

```python
# Updated main() function in incredagent_integration.py

def main():
    parser = argparse.ArgumentParser(description="IncredAgent - Enhanced Business Agent System")
    
    # Command groups
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Content generation command (existing)
    content_parser = subparsers.add_parser("content", help="Generate content")
    content_parser.add_argument("--topic", type=str, required=True, help="Topic for content generation")
    content_parser.add_argument("--style", type=str, help="Path to style profile JSON file")
    content_parser.add_argument("--output", type=str, help="Path to save generated content")
    
    # Business strategy command (existing)
    strategy_parser = subparsers.add_parser("strategy", help="Generate business strategy")
    strategy_parser.add_argument("--industry", type=str, required=True, help="Industry for strategy development")
    strategy_parser.add_argument("--business-model", type=str, required=True, help="Business model type")
    strategy_parser.add_argument("--target-market", type=str, help="Target market segment")
    strategy_parser.add_argument("--output", type=str, help="Path to save generated strategy")
    
    # Integrated command (existing)
    integrated_parser = subparsers.add_parser("integrated", help="Generate strategy-aligned content")
    integrated_parser.add_argument("--industry", type=str, required=True, help="Industry for strategy development")
    integrated_parser.add_argument("--business-model", type=str, required=True, help="Business model type")
    integrated_parser.add_argument("--topic", type=str, required=True, help="Topic for content generation")
    integrated_parser.add_argument("--style", type=str, help="Path to style profile JSON file")
    integrated_parser.add_argument("--output", type=str, help="Base path for saving outputs")
    
    # NEW: Document processing command
    document_parser = subparsers.add_parser("document", help="Process and analyze a document")
    document_parser.add_argument("--file", type=str, required=True, help="Path to the document file")
    document_parser.add_argument("--output", type=str, help="Path to save analysis results")
    
    # NEW: Code generation command
    code_parser = subparsers.add_parser("code", help="Generate code using Bolt")
    code_parser.add_argument("--prompt", type=str, required=True, help="Prompt for code generation")
    code_parser.add_argument("--tech-stack", type=str, help="Technology stack to use")
    code_parser.add_argument("--output", type=str, help="Path to save generated code")
    
    # NEW: Document-based strategy command
    doc_strategy_parser = subparsers.add_parser("doc-strategy", help="Generate strategy from document")
    doc_strategy_parser.add_argument("--file", type=str, required=True, help="Path to the document file")
    doc_strategy_parser.add_argument("--industry", type=str, required=True, help="Industry for strategy development")
    doc_strategy_parser.add_argument("--business-model", type=str, required=True, help="Business model type")
    doc_strategy_parser.add_argument("--output", type=str, help="Path to save results")
    
    # NEW: Strategy implementation command
    implementation_parser = subparsers.add_parser("implement", help="Generate code implementation for strategy")
    implementation_parser.add_argument("--strategy", type=str, required=True, help="Path to strategy JSON file")
    implementation_parser.add_argument("--tech-stack", type=str, required=True, help="Technology stack")
    implementation_parser.add_argument("--output", type=str, help="Path to save implementation")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Initialize the system
    system = IncredAgentSystem()
    
    # Add handlers for existing commands (content, strategy, integrated)
    
    # NEW: Handle document processing command
    if args.command == "document":
        # Process document
        print(f"Processing document: {args.file}")
        
        import asyncio
        result = asyncio.run(system.process_document(args.file))
        
        if result["status"] == "success":
            print("\nDocument processed successfully!")
            
            # Save if output path provided
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2)
                print(f"Analysis results saved to: {args.output}")
                
                # Also save a summary
                summary_path = args.output.replace(".json", "_summary.md")
                with open(summary_path, 'w', encoding='utf-8') as f:
                    f.write("# Document Analysis Summary\n\n")
                    f.write(result["result"]["content"]["summary"])
                print(f"Summary saved to: {summary_path}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            sys.exit(1)
    
    # NEW: Handle code generation command
    elif args.command == "code":
        # Generate code
        print(f"Generating code with prompt: {args.prompt}")
        
        tech_stack = args.tech_stack or "JavaScript/Node.js"
        context = {"tech_stack": tech_stack}
        
        import asyncio
        result = asyncio.run(system.generate_code(args.prompt, context))
        
        if result["status"] == "success":
            print("\nCode generated successfully!")
            
            # Save if output path provided
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(result["content"])
                print(f"Code saved to: {args.output}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            sys.exit(1)
    
    # NEW: Handle document-based strategy command
    elif args.command == "doc-strategy":
        # Generate strategy from document
        print(f"Generating strategy from document: {args.file}")
        
        import asyncio
        result = asyncio.run(system.document_based_strategy(
            args.file, args.industry, args.business_model
        ))
        
        if result["status"] == "success":
            print("\nStrategy generated successfully!")
            
            # Save if output path provided
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2)
                print(f"Results saved to: {args.output}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            sys.exit(1)
    
    # NEW: Handle implementation command
    elif args.command == "implement":
        # Generate implementation
        print(f"Generating implementation for strategy: {args.strategy}")
        
        # Load strategy from file
        try:
            with open(args.strategy, 'r', encoding='utf-8') as f:
                strategy = json.load(f)
        except Exception as e:
            print(f"Error loading strategy file: {e}")
            sys.exit(1)
        
        import asyncio
        result = asyncio.run(system.code_implementation(strategy, args.tech_stack))
        
        if result["status"] == "success":
            print("\nImplementation generated successfully!")
            
            # Save if output path provided
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    f.write(result["code_implementation"]["content"])
                print(f"Implementation saved to: {args.output}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            sys.exit(1)
    
    # Add handlers for existing commands (content, strategy, integrated)
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
```

## Integration Timeline

### Week 1: Core Integration
- Create BoltAgent class
- Implement DocumentProcessor
- Setup API bridge for Bolt communication
- Begin testing with simple workflows

### Week 2: Workflow Development
- Implement document processing workflow with LangGraph
- Connect Bolt with existing IncredAgent functionality
- Create code generation integration
- Set up document-based strategy workflow

### Week 3: CLI and Testing
- Extend CLI interface for new commands
- Implement comprehensive testing
- Create documentation
- Optimize for performance

### Week 4: Feedback and Refinement
- Add feedback mechanism integration
- Implement quality metrics
- Refine workflows based on testing
- Prepare for production use

## Next Steps

After completing this implementation plan, we'll be positioned to:

1. Continue enhancing the IncredAgent capabilities with additional specialized agents
2. Develop a more sophisticated web interface for business users
3. Create industry-specific templates and models
4. Implement learning from feedback to improve output quality over time
5. Extend the system with additional LangGraph workflows for complex business processes

This integration will transform IncredAgent into a powerful business intelligence platform by combining:
- Document analysis capabilities
- Code generation and implementation
- Business strategy development
- Content creation

All working together in an integrated, workflow-driven architecture that leverages the best of LangGraph, Bolt, and Claude's capabilities.