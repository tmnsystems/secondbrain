import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
from enum import Enum
from datetime import datetime

# Add the src directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from langgraph_integration import (
    WorkflowStatus, WorkflowState, NodeType, Edge, Node,
    Workflow, LangGraphIntegration
)

class TestLangGraphIntegration(unittest.TestCase):
    
    def setUp(self):
        # Mock langgraph.graph
        self.graph_mock = MagicMock()
        self.state_mock = MagicMock()
        self.compiled_graph_mock = MagicMock()
        self.workflow_manager_mock = MagicMock()
        
        # Mock add_node, add_edge, add_conditional_edge, etc.
        self.graph_mock.add_node = MagicMock()
        self.graph_mock.add_edge = MagicMock()
        self.graph_mock.add_conditional_edge = MagicMock()
        self.graph_mock.compile = MagicMock(return_value=self.compiled_graph_mock)
        
        # Patch the relevant imports
        self.state_patch = patch('langgraph_integration.StateGraph', return_value=self.graph_mock)
        self.state_mock = self.state_patch.start()
        
        # Create a LangGraphIntegration instance with mocked workflow manager
        self.integration = LangGraphIntegration(workflow_manager=self.workflow_manager_mock)
        
        # Sample node implementations
        self.sample_nodes = {
            "planner": MagicMock(return_value={"output": "planning complete"}),
            "executor": MagicMock(return_value={"output": "execution complete"}),
            "reviewer": MagicMock(return_value={"output": "review complete"})
        }
    
    def tearDown(self):
        # Stop all patches
        self.state_patch.stop()
    
    def test_create_workflow(self):
        # Test creating a new workflow
        nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=self.sample_nodes["planner"], metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=self.sample_nodes["executor"], metadata={"model": "gpt-4-mini"}),
            Node(id="reviewer", type=NodeType.AGENT, implementation=self.sample_nodes["reviewer"], metadata={"model": "gpt-4-o"})
        ]
        
        edges = [
            Edge(source="planner", target="executor"),
            Edge(source="executor", target="reviewer")
        ]
        
        # Create a new workflow
        workflow_id = self.integration.create_workflow(
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=nodes,
            edges=edges,
            entry_point="planner",
            exit_point="reviewer"
        )
        
        # Check that the workflow was stored in the workflow manager
        self.workflow_manager_mock.store_workflow.assert_called_once()
        
        # Verify the workflow object
        args, kwargs = self.workflow_manager_mock.store_workflow.call_args
        workflow = args[0]
        self.assertEqual(workflow.name, "test_workflow")
        self.assertEqual(workflow.description, "Test workflow for unit testing")
        self.assertEqual(workflow.status, WorkflowStatus.CREATED)
        self.assertEqual(len(workflow.nodes), 3)
        self.assertEqual(len(workflow.edges), 2)
        self.assertEqual(workflow.entry_point, "planner")
        self.assertEqual(workflow.exit_point, "reviewer")
        
        # Check that a workflow ID was returned
        self.assertIsNotNone(workflow_id)
    
    def test_build_workflow(self):
        # Create a sample workflow
        nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=self.sample_nodes["planner"], metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=self.sample_nodes["executor"], metadata={"model": "gpt-4-mini"}),
            Node(id="reviewer", type=NodeType.AGENT, implementation=self.sample_nodes["reviewer"], metadata={"model": "gpt-4-o"})
        ]
        
        edges = [
            Edge(source="planner", target="executor"),
            Edge(source="executor", target="reviewer")
        ]
        
        workflow = Workflow(
            id="test_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=nodes,
            edges=edges,
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock the retrieve_workflow method to return the sample workflow
        self.workflow_manager_mock.retrieve_workflow.return_value = workflow
        
        # Build the workflow
        graph = self.integration.build_workflow("test_workflow_id")
        
        # Check that the workflow manager's retrieve_workflow method was called
        self.workflow_manager_mock.retrieve_workflow.assert_called_once_with("test_workflow_id")
        
        # Check that the StateGraph was created
        self.state_mock.assert_called_once()
        
        # Check that nodes were added to the graph
        self.assertEqual(self.graph_mock.add_node.call_count, 3)
        
        # Check that edges were added to the graph
        self.assertEqual(self.graph_mock.add_edge.call_count, 2)
        
        # Check that the graph was compiled
        self.graph_mock.compile.assert_called_once()
        
        # Check that the workflow status was updated
        self.workflow_manager_mock.update_workflow_status.assert_called_once_with(
            "test_workflow_id", WorkflowStatus.BUILT
        )
        
        # Check that the compiled graph was returned
        self.assertEqual(graph, self.compiled_graph_mock)
    
    def test_run_workflow(self):
        # Create a sample workflow
        nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=self.sample_nodes["planner"], metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=self.sample_nodes["executor"], metadata={"model": "gpt-4-mini"}),
            Node(id="reviewer", type=NodeType.AGENT, implementation=self.sample_nodes["reviewer"], metadata={"model": "gpt-4-o"})
        ]
        
        edges = [
            Edge(source="planner", target="executor"),
            Edge(source="executor", target="reviewer")
        ]
        
        workflow = Workflow(
            id="test_run_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=nodes,
            edges=edges,
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.BUILT,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock the retrieve_workflow method to return the sample workflow
        self.workflow_manager_mock.retrieve_workflow.return_value = workflow
        
        # Mock the build_workflow method to return the compiled graph
        self.integration.build_workflow = MagicMock(return_value=self.compiled_graph_mock)
        
        # Mock the invoke method of the compiled graph
        final_result = {"output": "workflow execution complete"}
        self.compiled_graph_mock.invoke = MagicMock(return_value=final_result)
        
        # Run the workflow
        input_data = {"task": "test task"}
        result = self.integration.run_workflow("test_run_workflow_id", input_data)
        
        # Check that the workflow manager's retrieve_workflow method was called
        self.workflow_manager_mock.retrieve_workflow.assert_called_once_with("test_run_workflow_id")
        
        # Check that build_workflow was called
        self.integration.build_workflow.assert_called_once_with("test_run_workflow_id")
        
        # Check that invoke was called on the compiled graph with the input data
        self.compiled_graph_mock.invoke.assert_called_once_with(input_data)
        
        # Check that the workflow status was updated
        self.workflow_manager_mock.update_workflow_status.assert_called_once_with(
            "test_run_workflow_id", WorkflowStatus.RUNNING
        )
        
        # Check that the workflow result was stored
        self.workflow_manager_mock.store_workflow_result.assert_called_once_with(
            "test_run_workflow_id", final_result
        )
        
        # Check that the workflow result was returned
        self.assertEqual(result, final_result)
    
    def test_create_conditional_workflow(self):
        # Test creating a workflow with conditional edges
        nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=self.sample_nodes["planner"], metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=self.sample_nodes["executor"], metadata={"model": "gpt-4-mini"}),
            Node(id="reviewer", type=NodeType.AGENT, implementation=self.sample_nodes["reviewer"], metadata={"model": "gpt-4-o"})
        ]
        
        # Define a condition function for the conditional edge
        def review_condition(state):
            # Route to reviewer if needs_review is True
            return "reviewer" if state.get("needs_review", False) else "exit"
        
        # Create a workflow with conditional edges
        workflow_id = self.integration.create_conditional_workflow(
            name="conditional_workflow",
            description="Workflow with conditional edges",
            nodes=nodes,
            conditional_routing={
                "executor": review_condition
            },
            entry_point="planner",
            exit_point="reviewer"
        )
        
        # Check that the workflow was stored in the workflow manager
        self.workflow_manager_mock.store_workflow.assert_called_once()
        
        # Verify the workflow object
        args, kwargs = self.workflow_manager_mock.store_workflow.call_args
        workflow = args[0]
        self.assertEqual(workflow.name, "conditional_workflow")
        self.assertEqual(workflow.description, "Workflow with conditional edges")
        self.assertEqual(workflow.status, WorkflowStatus.CREATED)
        self.assertEqual(len(workflow.nodes), 3)
        self.assertIsNotNone(workflow.conditional_routing)
        self.assertEqual(workflow.entry_point, "planner")
        self.assertEqual(workflow.exit_point, "reviewer")
        
        # Check that a workflow ID was returned
        self.assertIsNotNone(workflow_id)
    
    def test_build_conditional_workflow(self):
        # Create a sample workflow with conditional routing
        nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=self.sample_nodes["planner"], metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=self.sample_nodes["executor"], metadata={"model": "gpt-4-mini"}),
            Node(id="reviewer", type=NodeType.AGENT, implementation=self.sample_nodes["reviewer"], metadata={"model": "gpt-4-o"})
        ]
        
        # Define a condition function for the conditional edge
        def review_condition(state):
            # Route to reviewer if needs_review is True
            return "reviewer" if state.get("needs_review", False) else "exit"
        
        conditional_routing = {
            "executor": review_condition
        }
        
        workflow = Workflow(
            id="test_conditional_workflow_id",
            name="conditional_workflow",
            description="Workflow with conditional edges",
            nodes=nodes,
            edges=[],
            conditional_routing=conditional_routing,
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock the retrieve_workflow method to return the sample workflow
        self.workflow_manager_mock.retrieve_workflow.return_value = workflow
        
        # Build the workflow
        graph = self.integration.build_workflow("test_conditional_workflow_id")
        
        # Check that the workflow manager's retrieve_workflow method was called
        self.workflow_manager_mock.retrieve_workflow.assert_called_once_with("test_conditional_workflow_id")
        
        # Check that the StateGraph was created
        self.state_mock.assert_called_once()
        
        # Check that nodes were added to the graph
        self.assertEqual(self.graph_mock.add_node.call_count, 3)
        
        # Check that conditional edges were added to the graph
        self.graph_mock.add_conditional_edge.assert_called_once()
        
        # Check that the graph was compiled
        self.graph_mock.compile.assert_called_once()
        
        # Check that the workflow status was updated
        self.workflow_manager_mock.update_workflow_status.assert_called_once_with(
            "test_conditional_workflow_id", WorkflowStatus.BUILT
        )
        
        # Check that the compiled graph was returned
        self.assertEqual(graph, self.compiled_graph_mock)
    
    def test_update_workflow(self):
        # Create a sample workflow
        nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=self.sample_nodes["planner"], metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=self.sample_nodes["executor"], metadata={"model": "gpt-4-mini"}),
        ]
        
        edges = [
            Edge(source="planner", target="executor"),
        ]
        
        workflow = Workflow(
            id="test_update_workflow_id",
            name="original_workflow",
            description="Original workflow description",
            nodes=nodes,
            edges=edges,
            entry_point="planner",
            exit_point="executor",
            status=WorkflowStatus.BUILT,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Mock the retrieve_workflow method to return the sample workflow
        self.workflow_manager_mock.retrieve_workflow.return_value = workflow
        
        # New nodes and edges to update the workflow
        new_node = Node(id="reviewer", type=NodeType.AGENT, implementation=self.sample_nodes["reviewer"], metadata={"model": "gpt-4-o"})
        new_edge = Edge(source="executor", target="reviewer")
        
        # Update the workflow
        updated_workflow_id = self.integration.update_workflow(
            workflow_id="test_update_workflow_id",
            name="updated_workflow",
            description="Updated workflow description",
            nodes_to_add=[new_node],
            edges_to_add=[new_edge],
            exit_point="reviewer"
        )
        
        # Check that the workflow manager's retrieve_workflow and update_workflow methods were called
        self.workflow_manager_mock.retrieve_workflow.assert_called_once_with("test_update_workflow_id")
        self.workflow_manager_mock.update_workflow.assert_called_once()
        
        # Verify the updated workflow object
        args, kwargs = self.workflow_manager_mock.update_workflow.call_args
        updated_workflow = args[0]
        self.assertEqual(updated_workflow.id, "test_update_workflow_id")
        self.assertEqual(updated_workflow.name, "updated_workflow")
        self.assertEqual(updated_workflow.description, "Updated workflow description")
        self.assertEqual(updated_workflow.status, WorkflowStatus.CREATED)  # Status reset to CREATED after update
        self.assertEqual(len(updated_workflow.nodes), 3)  # Original 2 + 1 new
        self.assertEqual(len(updated_workflow.edges), 2)  # Original 1 + 1 new
        self.assertEqual(updated_workflow.entry_point, "planner")  # Unchanged
        self.assertEqual(updated_workflow.exit_point, "reviewer")  # Updated
        
        # Check that the workflow ID was returned
        self.assertEqual(updated_workflow_id, "test_update_workflow_id")
    
    def test_delete_workflow(self):
        # Delete a workflow
        workflow_id = "test_delete_workflow_id"
        self.integration.delete_workflow(workflow_id)
        
        # Check that the workflow manager's delete_workflow method was called
        self.workflow_manager_mock.delete_workflow.assert_called_once_with(workflow_id)
    
    def test_list_workflows(self):
        # Create a list of sample workflows
        workflows = [
            Workflow(
                id=f"workflow_{i}",
                name=f"workflow_{i}",
                description=f"Description for workflow {i}",
                nodes=[],
                edges=[],
                entry_point="start",
                exit_point="end",
                status=WorkflowStatus.CREATED if i % 2 == 0 else WorkflowStatus.BUILT,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            for i in range(3)
        ]
        
        # Mock the list_workflows method to return the sample workflows
        self.workflow_manager_mock.list_workflows.return_value = workflows
        
        # List all workflows
        result = self.integration.list_workflows()
        
        # Check that the workflow manager's list_workflows method was called
        self.workflow_manager_mock.list_workflows.assert_called_once_with(None)
        
        # Check that the list of workflows was returned
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0].id, "workflow_0")
        self.assertEqual(result[1].id, "workflow_1")
        self.assertEqual(result[2].id, "workflow_2")
        
        # List workflows with a specific status
        self.workflow_manager_mock.list_workflows.reset_mock()
        self.workflow_manager_mock.list_workflows.return_value = [workflow for workflow in workflows if workflow.status == WorkflowStatus.CREATED]
        
        result = self.integration.list_workflows(status=WorkflowStatus.CREATED)
        
        # Check that the workflow manager's list_workflows method was called with the status filter
        self.workflow_manager_mock.list_workflows.assert_called_once_with(WorkflowStatus.CREATED)
        
        # Check that only workflows with status CREATED were returned
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].id, "workflow_0")
        self.assertEqual(result[0].status, WorkflowStatus.CREATED)
        self.assertEqual(result[1].id, "workflow_2")
        self.assertEqual(result[1].status, WorkflowStatus.CREATED)
    
    def test_get_workflow_result(self):
        # Test getting the results of a workflow execution
        workflow_id = "test_result_workflow_id"
        expected_result = {"output": "workflow execution complete"}
        
        # Mock the get_workflow_result method to return the sample result
        self.workflow_manager_mock.get_workflow_result.return_value = expected_result
        
        # Get the workflow result
        result = self.integration.get_workflow_result(workflow_id)
        
        # Check that the workflow manager's get_workflow_result method was called
        self.workflow_manager_mock.get_workflow_result.assert_called_once_with(workflow_id)
        
        # Check that the workflow result was returned
        self.assertEqual(result, expected_result)
    
    def test_reset_workflow(self):
        # Test resetting a workflow
        workflow_id = "test_reset_workflow_id"
        
        # Reset the workflow
        self.integration.reset_workflow(workflow_id)
        
        # Check that the workflow manager's update_workflow_status method was called
        self.workflow_manager_mock.update_workflow_status.assert_called_once_with(
            workflow_id, WorkflowStatus.CREATED
        )
    
    def test_get_workflow_history(self):
        # Test getting the execution history of a workflow
        workflow_id = "test_history_workflow_id"
        expected_history = [
            {"timestamp": datetime.now(), "event": "workflow_created"},
            {"timestamp": datetime.now(), "event": "workflow_built"},
            {"timestamp": datetime.now(), "event": "workflow_started"},
            {"timestamp": datetime.now(), "event": "node_executed", "node_id": "planner"},
            {"timestamp": datetime.now(), "event": "node_executed", "node_id": "executor"},
            {"timestamp": datetime.now(), "event": "workflow_completed"}
        ]
        
        # Mock the get_workflow_history method to return the sample history
        self.workflow_manager_mock.get_workflow_history.return_value = expected_history
        
        # Get the workflow history
        history = self.integration.get_workflow_history(workflow_id)
        
        # Check that the workflow manager's get_workflow_history method was called
        self.workflow_manager_mock.get_workflow_history.assert_called_once_with(workflow_id)
        
        # Check that the workflow history was returned
        self.assertEqual(history, expected_history)

class TestWorkflow(unittest.TestCase):
    
    def setUp(self):
        # Sample nodes and edges for testing
        self.sample_nodes = [
            Node(id="planner", type=NodeType.AGENT, implementation=MagicMock(), metadata={"model": "claude-3-sonnet"}),
            Node(id="executor", type=NodeType.AGENT, implementation=MagicMock(), metadata={"model": "gpt-4-mini"}),
            Node(id="reviewer", type=NodeType.AGENT, implementation=MagicMock(), metadata={"model": "gpt-4-o"})
        ]
        
        self.sample_edges = [
            Edge(source="planner", target="executor"),
            Edge(source="executor", target="reviewer")
        ]
    
    def test_workflow_creation(self):
        # Test creating a workflow
        workflow = Workflow(
            id="test_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes,
            edges=self.sample_edges,
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED
        )
        
        # Check that the workflow was created correctly
        self.assertEqual(workflow.id, "test_workflow_id")
        self.assertEqual(workflow.name, "test_workflow")
        self.assertEqual(workflow.description, "Test workflow for unit testing")
        self.assertEqual(workflow.status, WorkflowStatus.CREATED)
        self.assertEqual(len(workflow.nodes), 3)
        self.assertEqual(len(workflow.edges), 2)
        self.assertEqual(workflow.entry_point, "planner")
        self.assertEqual(workflow.exit_point, "reviewer")
        self.assertIsNotNone(workflow.created_at)
        self.assertIsNotNone(workflow.updated_at)
    
    def test_workflow_add_node(self):
        # Create a workflow
        workflow = Workflow(
            id="test_add_node_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes[:2],  # Only planner and executor
            edges=self.sample_edges[:1],  # Only planner -> executor
            entry_point="planner",
            exit_point="executor",
            status=WorkflowStatus.CREATED
        )
        
        # Add a new node
        workflow.add_node(self.sample_nodes[2])  # Add reviewer
        
        # Check that the node was added
        self.assertEqual(len(workflow.nodes), 3)
        self.assertEqual(workflow.nodes[2].id, "reviewer")
    
    def test_workflow_add_edge(self):
        # Create a workflow
        workflow = Workflow(
            id="test_add_edge_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes,  # All three nodes
            edges=self.sample_edges[:1],  # Only planner -> executor
            entry_point="planner",
            exit_point="executor",
            status=WorkflowStatus.CREATED
        )
        
        # Add a new edge
        workflow.add_edge(self.sample_edges[1])  # Add executor -> reviewer
        
        # Check that the edge was added
        self.assertEqual(len(workflow.edges), 2)
        self.assertEqual(workflow.edges[1].source, "executor")
        self.assertEqual(workflow.edges[1].target, "reviewer")
    
    def test_workflow_remove_node(self):
        # Create a workflow
        workflow = Workflow(
            id="test_remove_node_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes,  # All three nodes
            edges=self.sample_edges,  # Both edges
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED
        )
        
        # Remove a node
        workflow.remove_node("reviewer")
        
        # Check that the node and connected edges were removed
        self.assertEqual(len(workflow.nodes), 2)
        self.assertEqual(len(workflow.edges), 1)
        self.assertEqual(workflow.nodes[0].id, "planner")
        self.assertEqual(workflow.nodes[1].id, "executor")
        self.assertEqual(workflow.edges[0].source, "planner")
        self.assertEqual(workflow.edges[0].target, "executor")
    
    def test_workflow_remove_edge(self):
        # Create a workflow
        workflow = Workflow(
            id="test_remove_edge_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes,  # All three nodes
            edges=self.sample_edges,  # Both edges
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED
        )
        
        # Remove an edge
        workflow.remove_edge("executor", "reviewer")
        
        # Check that the edge was removed
        self.assertEqual(len(workflow.edges), 1)
        self.assertEqual(workflow.edges[0].source, "planner")
        self.assertEqual(workflow.edges[0].target, "executor")
    
    def test_workflow_get_node(self):
        # Create a workflow
        workflow = Workflow(
            id="test_get_node_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes,  # All three nodes
            edges=self.sample_edges,  # Both edges
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED
        )
        
        # Get a node
        node = workflow.get_node("executor")
        
        # Check that the correct node was returned
        self.assertEqual(node.id, "executor")
        self.assertEqual(node.type, NodeType.AGENT)
        self.assertEqual(node.metadata, {"model": "gpt-4-mini"})
    
    def test_workflow_to_dict(self):
        # Create a workflow
        workflow = Workflow(
            id="test_to_dict_workflow_id",
            name="test_workflow",
            description="Test workflow for unit testing",
            nodes=self.sample_nodes,  # All three nodes
            edges=self.sample_edges,  # Both edges
            entry_point="planner",
            exit_point="reviewer",
            status=WorkflowStatus.CREATED,
            created_at=datetime(2025, 5, 1, 12, 0, 0),
            updated_at=datetime(2025, 5, 1, 12, 30, 0)
        )
        
        # Convert the workflow to a dictionary
        workflow_dict = workflow.to_dict()
        
        # Check that the dictionary representation is correct
        self.assertEqual(workflow_dict["id"], "test_to_dict_workflow_id")
        self.assertEqual(workflow_dict["name"], "test_workflow")
        self.assertEqual(workflow_dict["description"], "Test workflow for unit testing")
        self.assertEqual(workflow_dict["status"], WorkflowStatus.CREATED.value)
        self.assertEqual(len(workflow_dict["nodes"]), 3)
        self.assertEqual(len(workflow_dict["edges"]), 2)
        self.assertEqual(workflow_dict["entry_point"], "planner")
        self.assertEqual(workflow_dict["exit_point"], "reviewer")
        self.assertEqual(workflow_dict["created_at"], "2025-05-01T12:00:00")
        self.assertEqual(workflow_dict["updated_at"], "2025-05-01T12:30:00")
    
    def test_workflow_from_dict(self):
        # Create a workflow dictionary
        workflow_dict = {
            "id": "test_from_dict_workflow_id",
            "name": "test_workflow",
            "description": "Test workflow for unit testing",
            "nodes": [
                {
                    "id": "planner",
                    "type": NodeType.AGENT.value,
                    "metadata": {"model": "claude-3-sonnet"}
                },
                {
                    "id": "executor",
                    "type": NodeType.AGENT.value,
                    "metadata": {"model": "gpt-4-mini"}
                }
            ],
            "edges": [
                {
                    "source": "planner",
                    "target": "executor"
                }
            ],
            "entry_point": "planner",
            "exit_point": "executor",
            "status": WorkflowStatus.CREATED.value,
            "created_at": "2025-05-01T12:00:00",
            "updated_at": "2025-05-01T12:30:00"
        }
        
        # This is a simplified test since we can't easily serialize the implementation functions
        # In a real scenario, you would need to handle the implementation functions separately
        
        # We need to mock the implementation functions since they aren't in the dictionary
        with patch('langgraph_integration.Node') as mock_node:
            # Set up the mock to return nodes with mock implementations
            mock_node.side_effect = lambda **kwargs: Node(
                id=kwargs["id"],
                type=NodeType(kwargs["type"]) if isinstance(kwargs["type"], str) else kwargs["type"],
                implementation=MagicMock(),
                metadata=kwargs["metadata"]
            )
            
            # Create a workflow from the dictionary
            workflow = Workflow.from_dict(workflow_dict)
            
            # Check that the workflow was created correctly
            self.assertEqual(workflow.id, "test_from_dict_workflow_id")
            self.assertEqual(workflow.name, "test_workflow")
            self.assertEqual(workflow.description, "Test workflow for unit testing")
            self.assertEqual(workflow.status, WorkflowStatus.CREATED)
            self.assertEqual(len(workflow.nodes), 2)
            self.assertEqual(len(workflow.edges), 1)
            self.assertEqual(workflow.entry_point, "planner")
            self.assertEqual(workflow.exit_point, "executor")
            self.assertEqual(workflow.created_at, datetime(2025, 5, 1, 12, 0, 0))
            self.assertEqual(workflow.updated_at, datetime(2025, 5, 1, 12, 30, 0))

class TestWorkflowState(unittest.TestCase):
    
    def test_workflow_state_creation(self):
        # Test creating a workflow state
        state = WorkflowState(
            workflow_id="test_state_workflow_id",
            current_node="planner",
            state_data={"input": "test input", "output": "test output"},
            status=WorkflowStatus.RUNNING
        )
        
        # Check that the state was created correctly
        self.assertEqual(state.workflow_id, "test_state_workflow_id")
        self.assertEqual(state.current_node, "planner")
        self.assertEqual(state.state_data, {"input": "test input", "output": "test output"})
        self.assertEqual(state.status, WorkflowStatus.RUNNING)
        self.assertIsNotNone(state.created_at)
        self.assertIsNotNone(state.updated_at)
    
    def test_workflow_state_to_dict(self):
        # Create a workflow state
        state = WorkflowState(
            workflow_id="test_to_dict_state_id",
            current_node="planner",
            state_data={"input": "test input", "output": "test output"},
            status=WorkflowStatus.RUNNING,
            created_at=datetime(2025, 5, 1, 12, 0, 0),
            updated_at=datetime(2025, 5, 1, 12, 30, 0)
        )
        
        # Convert the state to a dictionary
        state_dict = state.to_dict()
        
        # Check that the dictionary representation is correct
        self.assertEqual(state_dict["workflow_id"], "test_to_dict_state_id")
        self.assertEqual(state_dict["current_node"], "planner")
        self.assertEqual(state_dict["state_data"], {"input": "test input", "output": "test output"})
        self.assertEqual(state_dict["status"], WorkflowStatus.RUNNING.value)
        self.assertEqual(state_dict["created_at"], "2025-05-01T12:00:00")
        self.assertEqual(state_dict["updated_at"], "2025-05-01T12:30:00")
    
    def test_workflow_state_from_dict(self):
        # Create a workflow state dictionary
        state_dict = {
            "workflow_id": "test_from_dict_state_id",
            "current_node": "planner",
            "state_data": {"input": "test input", "output": "test output"},
            "status": WorkflowStatus.RUNNING.value,
            "created_at": "2025-05-01T12:00:00",
            "updated_at": "2025-05-01T12:30:00"
        }
        
        # Create a workflow state from the dictionary
        state = WorkflowState.from_dict(state_dict)
        
        # Check that the state was created correctly
        self.assertEqual(state.workflow_id, "test_from_dict_state_id")
        self.assertEqual(state.current_node, "planner")
        self.assertEqual(state.state_data, {"input": "test input", "output": "test output"})
        self.assertEqual(state.status, WorkflowStatus.RUNNING)
        self.assertEqual(state.created_at, datetime(2025, 5, 1, 12, 0, 0))
        self.assertEqual(state.updated_at, datetime(2025, 5, 1, 12, 30, 0))
    
    def test_workflow_state_update(self):
        # Create a workflow state
        state = WorkflowState(
            workflow_id="test_update_state_id",
            current_node="planner",
            state_data={"input": "test input"},
            status=WorkflowStatus.RUNNING
        )
        
        # Update the state
        initial_updated_at = state.updated_at
        state.update(
            current_node="executor",
            state_data={"input": "test input", "output": "planning complete"},
            status=WorkflowStatus.RUNNING
        )
        
        # Check that the state was updated correctly
        self.assertEqual(state.current_node, "executor")
        self.assertEqual(state.state_data, {"input": "test input", "output": "planning complete"})
        self.assertEqual(state.status, WorkflowStatus.RUNNING)
        self.assertNotEqual(state.updated_at, initial_updated_at)

if __name__ == '__main__':
    unittest.main()