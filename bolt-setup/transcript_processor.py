"""
Transcript processing pipeline for SecondBrain.

This module implements a LangGraph-based pipeline for:
- Ingesting transcripts
- Separating speakers
- Extracting style patterns
- Analyzing teaching effectiveness
- Recognizing reasoning patterns
- Cataloging analogies
- Vectorizing processed content
"""

import os
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel, Field
import langgraph.graph as lg
from langgraph.prebuilt import ToolNode
from langgraph.graph import StateGraph

# Models for transcript processing
class Speaker(BaseModel):
    name: str
    segments: List[str] = []

class TranscriptSegment(BaseModel):
    speaker: str
    text: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class StylePattern(BaseModel):
    pattern_type: str  # e.g., "metaphor", "analogy", "storytelling", "questioning"
    example: str
    context: str
    effectiveness: int = Field(ge=1, le=10)  # 1-10 rating
    notes: str = ""

class ReasoningPattern(BaseModel):
    pattern_type: str  # e.g., "inductive", "deductive", "abductive", "analogical"
    example: str
    conclusion: str
    effectiveness: int = Field(ge=1, le=10)  # 1-10 rating
    notes: str = ""

class TeachingEffectiveness(BaseModel):
    clarity: int = Field(ge=1, le=10)
    engagement: int = Field(ge=1, le=10)
    relevance: int = Field(ge=1, le=10)
    audience_response: int = Field(ge=1, le=10)
    overall: int = Field(ge=1, le=10)
    notes: str = ""

class ProcessedTranscript(BaseModel):
    filename: str
    speakers: List[Speaker] = []
    segments: List[TranscriptSegment] = []
    style_patterns: List[StylePattern] = []
    reasoning_patterns: List[ReasoningPattern] = []
    teaching_effectiveness: TeachingEffectiveness = Field(default_factory=TeachingEffectiveness)
    vectors: Optional[Dict[str, List[float]]] = None
    metadata: Dict[str, Any] = {}

class ProcessingState(BaseModel):
    input_path: str
    raw_text: Optional[str] = None
    current_stage: str = "init"
    processed_transcript: Optional[ProcessedTranscript] = None
    error: Optional[str] = None
    stage_outputs: Dict[str, Any] = {}

# Pipeline functions
def ingest_transcript(state: ProcessingState) -> ProcessingState:
    """Load transcript from file."""
    try:
        with open(state.input_path, 'r', encoding='utf-8') as f:
            raw_text = f.read()
        
        filename = os.path.basename(state.input_path)
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=raw_text,
            current_stage="ingested",
            processed_transcript=ProcessedTranscript(filename=filename),
            stage_outputs={**state.stage_outputs, "ingest": "Successfully loaded transcript"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            current_stage="error",
            error=f"Error ingesting transcript: {str(e)}",
            stage_outputs={**state.stage_outputs, "ingest": f"Error: {str(e)}"}
        )

def separate_speakers(state: ProcessingState) -> ProcessingState:
    """Separate speakers from the transcript."""
    if state.current_stage == "error" or not state.raw_text:
        return state
    
    try:
        # In a real implementation, this would use an LLM to separate speakers
        # For now, we'll use a simple pattern matching approach
        
        # Example pattern: "Speaker Name: Some text here"
        speaker_pattern = r"([A-Za-z\s]+)(?::|-)(?:\s+)(.+)"
        
        speakers = {}
        segments = []
        
        for line in state.raw_text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            match = re.match(speaker_pattern, line)
            if match:
                speaker_name = match.group(1).strip()
                text = match.group(2).strip()
                
                if speaker_name not in speakers:
                    speakers[speaker_name] = Speaker(name=speaker_name)
                
                speakers[speaker_name].segments.append(text)
                segments.append(TranscriptSegment(speaker=speaker_name, text=text))
        
        # Update the processed transcript
        processed_transcript = state.processed_transcript
        if processed_transcript:
            processed_transcript.speakers = list(speakers.values())
            processed_transcript.segments = segments
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="speakers_separated",
            processed_transcript=processed_transcript,
            stage_outputs={**state.stage_outputs, "separate": f"Identified {len(speakers)} speakers"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="error",
            processed_transcript=state.processed_transcript,
            error=f"Error separating speakers: {str(e)}",
            stage_outputs={**state.stage_outputs, "separate": f"Error: {str(e)}"}
        )

def extract_style(state: ProcessingState) -> ProcessingState:
    """Extract style patterns from the transcript."""
    if state.current_stage == "error" or not state.processed_transcript:
        return state
    
    try:
        # In a real implementation, this would use an LLM to extract style patterns
        # For now, we'll add a placeholder pattern
        
        style_patterns = [
            StylePattern(
                pattern_type="analogy",
                example="It's like building a house without a blueprint",
                context="Explaining the importance of strategic planning",
                effectiveness=8,
                notes="Effective analogy that resonated with the audience"
            )
        ]
        
        # Update the processed transcript
        processed_transcript = state.processed_transcript
        processed_transcript.style_patterns = style_patterns
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="style_extracted",
            processed_transcript=processed_transcript,
            stage_outputs={**state.stage_outputs, "extract_style": f"Extracted {len(style_patterns)} style patterns"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="error",
            processed_transcript=state.processed_transcript,
            error=f"Error extracting style: {str(e)}",
            stage_outputs={**state.stage_outputs, "extract_style": f"Error: {str(e)}"}
        )

def analyze_effectiveness(state: ProcessingState) -> ProcessingState:
    """Analyze teaching effectiveness from the transcript."""
    if state.current_stage == "error" or not state.processed_transcript:
        return state
    
    try:
        # In a real implementation, this would use an LLM to analyze effectiveness
        # For now, we'll add a placeholder analysis
        
        effectiveness = TeachingEffectiveness(
            clarity=8,
            engagement=9,
            relevance=7,
            audience_response=8,
            overall=8,
            notes="Strong engagement and clear explanations. Could improve on relevance of examples."
        )
        
        # Update the processed transcript
        processed_transcript = state.processed_transcript
        processed_transcript.teaching_effectiveness = effectiveness
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="effectiveness_analyzed",
            processed_transcript=processed_transcript,
            stage_outputs={**state.stage_outputs, "analyze_effectiveness": f"Analyzed teaching effectiveness: {effectiveness.overall}/10"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="error",
            processed_transcript=state.processed_transcript,
            error=f"Error analyzing effectiveness: {str(e)}",
            stage_outputs={**state.stage_outputs, "analyze_effectiveness": f"Error: {str(e)}"}
        )

def recognize_reasoning_patterns(state: ProcessingState) -> ProcessingState:
    """Recognize reasoning patterns from the transcript."""
    if state.current_stage == "error" or not state.processed_transcript:
        return state
    
    try:
        # In a real implementation, this would use an LLM to recognize reasoning patterns
        # For now, we'll add a placeholder pattern
        
        reasoning_patterns = [
            ReasoningPattern(
                pattern_type="deductive",
                example="If a business doesn't track metrics, it can't improve what it doesn't measure. You're not tracking your client acquisition metrics, so you can't improve your client acquisition process.",
                conclusion="Implement metrics tracking for client acquisition",
                effectiveness=9,
                notes="Clear logical reasoning with practical application"
            )
        ]
        
        # Update the processed transcript
        processed_transcript = state.processed_transcript
        processed_transcript.reasoning_patterns = reasoning_patterns
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="reasoning_recognized",
            processed_transcript=processed_transcript,
            stage_outputs={**state.stage_outputs, "recognize_patterns": f"Recognized {len(reasoning_patterns)} reasoning patterns"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="error",
            processed_transcript=state.processed_transcript,
            error=f"Error recognizing reasoning patterns: {str(e)}",
            stage_outputs={**state.stage_outputs, "recognize_patterns": f"Error: {str(e)}"}
        )

def catalog_analogies(state: ProcessingState) -> ProcessingState:
    """Catalog analogies from the transcript."""
    if state.current_stage == "error" or not state.processed_transcript:
        return state
    
    try:
        # In a real implementation, this would use an LLM to extract analogies
        # For now, we'll just update some metadata
        
        # Update the processed transcript
        processed_transcript = state.processed_transcript
        processed_transcript.metadata["analogy_count"] = len(processed_transcript.style_patterns)
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="analogies_cataloged",
            processed_transcript=processed_transcript,
            stage_outputs={**state.stage_outputs, "catalog_analogies": f"Cataloged {processed_transcript.metadata['analogy_count']} analogies"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="error",
            processed_transcript=state.processed_transcript,
            error=f"Error cataloging analogies: {str(e)}",
            stage_outputs={**state.stage_outputs, "catalog_analogies": f"Error: {str(e)}"}
        )

def vectorize_content(state: ProcessingState) -> ProcessingState:
    """Vectorize the processed content for storage."""
    if state.current_stage == "error" or not state.processed_transcript:
        return state
    
    try:
        # In a real implementation, this would use FastEmbed to create embeddings
        # For now, we'll add a placeholder vector
        
        vectors = {
            "transcript": [0.1, 0.2, 0.3, 0.4, 0.5],  # Placeholder
            "style": [0.2, 0.3, 0.4, 0.5, 0.6],       # Placeholder
            "reasoning": [0.3, 0.4, 0.5, 0.6, 0.7]    # Placeholder
        }
        
        # Update the processed transcript
        processed_transcript = state.processed_transcript
        processed_transcript.vectors = vectors
        
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="completed",
            processed_transcript=processed_transcript,
            stage_outputs={**state.stage_outputs, "vectorize": f"Vectorized content with {len(vectors)} vector types"}
        )
    except Exception as e:
        return ProcessingState(
            input_path=state.input_path,
            raw_text=state.raw_text,
            current_stage="error",
            processed_transcript=state.processed_transcript,
            error=f"Error vectorizing content: {str(e)}",
            stage_outputs={**state.stage_outputs, "vectorize": f"Error: {str(e)}"}
        )

def save_processed_transcript(state: ProcessingState, output_dir: str) -> bool:
    """Save the processed transcript to a file."""
    if state.current_stage == "error" or not state.processed_transcript:
        return False
    
    try:
        # Create the output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate the output filename
        filename = state.processed_transcript.filename
        base_name, _ = os.path.splitext(filename)
        output_path = os.path.join(output_dir, f"{base_name}_processed.json")
        
        # Save the processed transcript as JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(state.processed_transcript.dict(), f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error saving processed transcript: {str(e)}")
        return False

# Build the transcript processing workflow
def build_workflow() -> StateGraph:
    """Build the transcript processing workflow graph."""
    workflow = StateGraph(ProcessingState)
    
    # Add nodes
    workflow.add_node("ingest", ingest_transcript)
    workflow.add_node("separate", separate_speakers)
    workflow.add_node("extract_style", extract_style)
    workflow.add_node("analyze_effectiveness", analyze_effectiveness)
    workflow.add_node("recognize_patterns", recognize_reasoning_patterns)
    workflow.add_node("catalog_analogies", catalog_analogies)
    workflow.add_node("vectorize", vectorize_content)
    
    # Add edges
    workflow.add_edge("ingest", "separate")
    workflow.add_edge("separate", "extract_style")
    workflow.add_edge("extract_style", "analyze_effectiveness")
    workflow.add_edge("analyze_effectiveness", "recognize_patterns")
    workflow.add_edge("recognize_patterns", "catalog_analogies")
    workflow.add_edge("catalog_analogies", "vectorize")
    
    # Set entry point
    workflow.set_entry_point("ingest")
    
    return workflow

def process_transcript(transcript_path: str, output_dir: str = "./processed_transcripts") -> Tuple[bool, Dict[str, Any]]:
    """Process a transcript file through the workflow."""
    # Create the workflow
    workflow = build_workflow().compile()
    
    # Create the initial state
    initial_state = ProcessingState(input_path=transcript_path)
    
    # Execute the workflow
    try:
        final_state = workflow.invoke(initial_state)
        
        # Save the processed transcript
        success = save_processed_transcript(final_state, output_dir)
        
        return success, {
            "status": "success" if success else "error_saving",
            "filename": os.path.basename(transcript_path),
            "stages": final_state.stage_outputs,
            "error": final_state.error,
            "output_dir": output_dir
        }
    except Exception as e:
        return False, {
            "status": "error",
            "filename": os.path.basename(transcript_path),
            "error": str(e),
            "output_dir": output_dir
        }

def batch_process_transcripts(transcript_dir: str, output_dir: str = "./processed_transcripts") -> List[Dict[str, Any]]:
    """Process all transcript files in a directory."""
    results = []
    
    # Get all text files in the directory
    for filename in os.listdir(transcript_dir):
        if filename.endswith(".txt"):
            transcript_path = os.path.join(transcript_dir, filename)
            success, result = process_transcript(transcript_path, output_dir)
            results.append(result)
    
    return results

if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        transcript_path = sys.argv[1]
        output_dir = sys.argv[2] if len(sys.argv) > 2 else "./processed_transcripts"
        
        print(f"Processing transcript: {transcript_path}")
        success, result = process_transcript(transcript_path, output_dir)
        
        if success:
            print(f"Successfully processed transcript to {result['output_dir']}")
        else:
            print(f"Error processing transcript: {result['error']}")
    else:
        print("Usage: python transcript_processor.py <transcript_path> [output_dir]")