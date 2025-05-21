"""
Agent Security: Implements authentication, authorization, and security measures for
the multi-agent system within the SecondBrain architecture.

This module provides security mechanisms for agent authentication, message validation,
access control, and secure credential management to prevent unauthorized access and
ensure the integrity of agent interactions.
"""

import os
import json
import time
import hmac
import hashlib
import base64
import logging
import secrets
import asyncio
from typing import Dict, List, Any, Optional, Union, Set, Callable
from enum import Enum
from dataclasses import dataclass, field, asdict

from .agent_manager import Agent, AgentRole, AgentState, Message, MessagePriority
from .communication_protocol import MessageType, MessageBus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('agent_security')

# Permission levels
class PermissionLevel(int, Enum):
    NONE = 0
    READ = 1
    WRITE = 2
    EXECUTE = 3
    ADMIN = 4

# Message validation results
class ValidationResult(str, Enum):
    VALID = "valid"
    INVALID_SIGNATURE = "invalid_signature"
    EXPIRED = "expired"
    UNAUTHORIZED = "unauthorized"
    INVALID_FORMAT = "invalid_format"
    REJECTED = "rejected"

@dataclass
class AgentCredential:
    """Agent authentication credential"""
    agent_id: str
    api_key: str
    secret_key: str
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    permissions: Dict[str, PermissionLevel] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = asdict(self)
        # Convert permissions to their values
        result["permissions"] = {k: v.value for k, v in self.permissions.items()}
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentCredential':
        """Create from dictionary representation"""
        # Convert permission values to enums
        if "permissions" in data:
            data["permissions"] = {
                k: PermissionLevel(v) for k, v in data["permissions"].items()
            }
        
        return cls(**data)
    
    def is_expired(self) -> bool:
        """Check if credential has expired"""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at
    
    def has_permission(self, resource: str, level: PermissionLevel) -> bool:
        """Check if credential has required permission level for resource"""
        # Check if credential has explicit permission for resource
        if resource in self.permissions:
            return self.permissions[resource] >= level
        
        # Check if credential has wildcard permission
        if "*" in self.permissions:
            return self.permissions["*"] >= level
        
        # Check if credential has permission for resource parent
        parent_resource = ".".join(resource.split(".")[:-1])
        if parent_resource and parent_resource in self.permissions:
            return self.permissions[parent_resource] >= level
        
        return False

@dataclass
class AccessPolicy:
    """Access control policy"""
    policy_id: str
    name: str
    resources: List[str]
    allowed_roles: List[AgentRole]
    permission_level: PermissionLevel
    conditions: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = asdict(self)
        # Convert enums to their values
        result["allowed_roles"] = [role.value for role in self.allowed_roles]
        result["permission_level"] = self.permission_level.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AccessPolicy':
        """Create from dictionary representation"""
        # Convert string values to enums
        if "allowed_roles" in data:
            data["allowed_roles"] = [AgentRole(role) for role in data["allowed_roles"]]
        if "permission_level" in data:
            data["permission_level"] = PermissionLevel(data["permission_level"])
        
        return cls(**data)

class AgentSecurityManager:
    """
    Manages security for the agent system, including authentication, 
    authorization, and message validation.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.logger = logging.getLogger('agent_security')
        
        # Agent credentials
        self.credentials: Dict[str, AgentCredential] = {}
        
        # Access policies
        self.policies: Dict[str, AccessPolicy] = {}
        
        # Message validators
        self.message_validators: List[Callable[[Message], ValidationResult]] = []
        
        # Initialize from config
        self._initialize_from_config()
    
    def _initialize_from_config(self) -> None:
        """Initialize security manager from configuration"""
        # Load credentials from config
        credentials_config = self.config.get("credentials", [])
        for cred_data in credentials_config:
            try:
                credential = AgentCredential.from_dict(cred_data)
                self.credentials[credential.agent_id] = credential
                self.logger.info(f"Loaded credential for agent {credential.agent_id}")
            except Exception as e:
                self.logger.error(f"Error loading credential: {str(e)}")
        
        # Load policies from config
        policies_config = self.config.get("policies", [])
        for policy_data in policies_config:
            try:
                policy = AccessPolicy.from_dict(policy_data)
                self.policies[policy.policy_id] = policy
                self.logger.info(f"Loaded policy {policy.policy_id}: {policy.name}")
            except Exception as e:
                self.logger.error(f"Error loading policy: {str(e)}")
        
        # Initialize default policies if none exist
        if not self.policies:
            self._initialize_default_policies()
        
        # Register message validators
        self.register_message_validator(self._validate_message_signature)
        self.register_message_validator(self._validate_message_authorization)
    
    def _initialize_default_policies(self) -> None:
        """Initialize default access policies"""
        import uuid
        
        # Admin policy (full access)
        admin_policy = AccessPolicy(
            policy_id=str(uuid.uuid4()),
            name="Admin Access",
            resources=["*"],
            allowed_roles=[AgentRole.ORCHESTRATOR],
            permission_level=PermissionLevel.ADMIN
        )
        self.policies[admin_policy.policy_id] = admin_policy
        
        # Planner policy
        planner_policy = AccessPolicy(
            policy_id=str(uuid.uuid4()),
            name="Planner Access",
            resources=["task.*", "workflow.*", "plan.*"],
            allowed_roles=[AgentRole.PLANNER],
            permission_level=PermissionLevel.WRITE
        )
        self.policies[planner_policy.policy_id] = planner_policy
        
        # Executor policy
        executor_policy = AccessPolicy(
            policy_id=str(uuid.uuid4()),
            name="Executor Access",
            resources=["task.*", "tool.*", "workflow.step.*"],
            allowed_roles=[AgentRole.EXECUTOR],
            permission_level=PermissionLevel.EXECUTE
        )
        self.policies[executor_policy.policy_id] = executor_policy
        
        # Reviewer policy
        reviewer_policy = AccessPolicy(
            policy_id=str(uuid.uuid4()),
            name="Reviewer Access",
            resources=["review.*", "task.review.*"],
            allowed_roles=[AgentRole.REVIEWER],
            permission_level=PermissionLevel.WRITE
        )
        self.policies[reviewer_policy.policy_id] = reviewer_policy
        
        # Notion policy
        notion_policy = AccessPolicy(
            policy_id=str(uuid.uuid4()),
            name="Notion Access",
            resources=["notion.*", "document.*"],
            allowed_roles=[AgentRole.NOTION],
            permission_level=PermissionLevel.WRITE
        )
        self.policies[notion_policy.policy_id] = notion_policy
        
        self.logger.info("Initialized default access policies")
    
    def generate_agent_credential(
        self,
        agent_id: str,
        expires_in: Optional[float] = None,
        permissions: Optional[Dict[str, PermissionLevel]] = None
    ) -> AgentCredential:
        """Generate a new credential for an agent"""
        # Generate API key and secret key
        api_key = f"agent_{agent_id}_{secrets.token_hex(8)}"
        secret_key = secrets.token_hex(32)
        
        # Create expiration timestamp if specified
        expires_at = None
        if expires_in is not None:
            expires_at = time.time() + expires_in
        
        # Create credential
        credential = AgentCredential(
            agent_id=agent_id,
            api_key=api_key,
            secret_key=secret_key,
            expires_at=expires_at,
            permissions=permissions or {}
        )
        
        # Store credential
        self.credentials[agent_id] = credential
        
        self.logger.info(f"Generated credential for agent {agent_id}")
        return credential
    
    def register_agent_credential(self, credential: AgentCredential) -> None:
        """Register an existing agent credential"""
        self.credentials[credential.agent_id] = credential
        self.logger.info(f"Registered credential for agent {credential.agent_id}")
    
    def get_agent_credential(self, agent_id: str) -> Optional[AgentCredential]:
        """Get an agent's credential"""
        return self.credentials.get(agent_id)
    
    def revoke_agent_credential(self, agent_id: str) -> bool:
        """Revoke an agent's credential"""
        if agent_id in self.credentials:
            del self.credentials[agent_id]
            self.logger.info(f"Revoked credential for agent {agent_id}")
            return True
        return False
    
    def create_access_policy(
        self,
        name: str,
        resources: List[str],
        allowed_roles: List[AgentRole],
        permission_level: PermissionLevel,
        conditions: Dict[str, Any] = None
    ) -> AccessPolicy:
        """Create a new access policy"""
        import uuid
        
        policy = AccessPolicy(
            policy_id=str(uuid.uuid4()),
            name=name,
            resources=resources,
            allowed_roles=allowed_roles,
            permission_level=permission_level,
            conditions=conditions or {}
        )
        
        # Store policy
        self.policies[policy.policy_id] = policy
        
        self.logger.info(f"Created access policy {policy.policy_id}: {name}")
        return policy
    
    def get_access_policy(self, policy_id: str) -> Optional[AccessPolicy]:
        """Get an access policy by ID"""
        return self.policies.get(policy_id)
    
    def delete_access_policy(self, policy_id: str) -> bool:
        """Delete an access policy"""
        if policy_id in self.policies:
            del self.policies[policy_id]
            self.logger.info(f"Deleted access policy {policy_id}")
            return True
        return False
    
    def get_policies_for_role(self, role: AgentRole) -> List[AccessPolicy]:
        """Get all access policies applicable to a role"""
        return [
            policy for policy in self.policies.values()
            if role in policy.allowed_roles
        ]
    
    def get_policies_for_resource(self, resource: str) -> List[AccessPolicy]:
        """Get all access policies applicable to a resource"""
        applicable_policies = []
        
        for policy in self.policies.values():
            # Check for exact resource match
            if resource in policy.resources:
                applicable_policies.append(policy)
                continue
            
            # Check for wildcard matches
            for policy_resource in policy.resources:
                # Exact wildcard match
                if policy_resource == "*":
                    applicable_policies.append(policy)
                    break
                
                # Prefix wildcard match
                if policy_resource.endswith(".*"):
                    prefix = policy_resource[:-2]
                    if resource == prefix or resource.startswith(f"{prefix}."):
                        applicable_policies.append(policy)
                        break
        
        return applicable_policies
    
    def check_permission(
        self,
        agent_id: str,
        resource: str,
        required_level: PermissionLevel
    ) -> bool:
        """Check if an agent has the required permission for a resource"""
        # Get agent credential
        credential = self.get_agent_credential(agent_id)
        if not credential:
            self.logger.warning(f"No credential found for agent {agent_id}")
            return False
        
        # Check if credential is expired
        if credential.is_expired():
            self.logger.warning(f"Credential for agent {agent_id} is expired")
            return False
        
        # Check credential permissions
        if credential.has_permission(resource, required_level):
            return True
        
        # No explicit permission in credential, check policies
        agent_role = None
        try:
            agent_role = AgentRole(agent_id.split('_')[0])
        except (ValueError, IndexError):
            self.logger.warning(f"Could not determine role for agent {agent_id}")
            return False
        
        # Get applicable policies
        policies = self.get_policies_for_resource(resource)
        
        # Check if any policy grants the required permission
        for policy in policies:
            if agent_role in policy.allowed_roles and policy.permission_level >= required_level:
                return self._check_policy_conditions(policy, agent_id, resource)
        
        return False
    
    def _check_policy_conditions(
        self,
        policy: AccessPolicy,
        agent_id: str,
        resource: str
    ) -> bool:
        """Check if policy conditions are satisfied"""
        # If no conditions, policy applies
        if not policy.conditions:
            return True
        
        # Check time-based conditions
        if "time_window" in policy.conditions:
            time_window = policy.conditions["time_window"]
            current_time = time.time()
            
            start_time = time_window.get("start")
            end_time = time_window.get("end")
            
            if start_time and current_time < start_time:
                return False
                
            if end_time and current_time > end_time:
                return False
        
        # Check IP-based conditions
        if "allowed_ips" in policy.conditions:
            # Not applicable in this context
            pass
        
        # All conditions satisfied
        return True
    
    def sign_message(self, message: Message, agent_id: str) -> Message:
        """Sign a message with an agent's credential"""
        # Get agent credential
        credential = self.get_agent_credential(agent_id)
        if not credential:
            self.logger.warning(f"No credential found for agent {agent_id}")
            return message
        
        # Create message signature
        timestamp = time.time()
        message_data = {
            "id": message.id,
            "sender": message.sender,
            "recipient": message.recipient,
            "timestamp": timestamp
        }
        
        message_json = json.dumps(message_data, sort_keys=True)
        signature = self._create_signature(message_json, credential.secret_key)
        
        # Add security metadata to message
        if not hasattr(message, "security") or not message.security:
            message.security = {}
            
        message.security.update({
            "api_key": credential.api_key,
            "timestamp": timestamp,
            "signature": signature
        })
        
        return message
    
    def validate_message(self, message: Message) -> ValidationResult:
        """Validate a message using registered validators"""
        for validator in self.message_validators:
            result = validator(message)
            if result != ValidationResult.VALID:
                return result
                
        return ValidationResult.VALID
    
    def register_message_validator(
        self,
        validator: Callable[[Message], ValidationResult]
    ) -> None:
        """Register a message validator"""
        self.message_validators.append(validator)
    
    def _validate_message_signature(self, message: Message) -> ValidationResult:
        """Validate message signature"""
        # Check if message has security metadata
        if not hasattr(message, "security") or not message.security:
            self.logger.warning(f"Message {message.id} has no security metadata")
            return ValidationResult.INVALID_SIGNATURE
            
        # Get security metadata
        security = message.security
        
        # Check for required fields
        if "api_key" not in security or "timestamp" not in security or "signature" not in security:
            self.logger.warning(f"Message {message.id} has incomplete security metadata")
            return ValidationResult.INVALID_SIGNATURE
            
        api_key = security["api_key"]
        timestamp = security["timestamp"]
        signature = security["signature"]
        
        # Find agent credential by API key
        credential = None
        for cred in self.credentials.values():
            if cred.api_key == api_key:
                credential = cred
                break
                
        if not credential:
            self.logger.warning(f"No credential found for API key {api_key}")
            return ValidationResult.INVALID_SIGNATURE
            
        # Check if credential is expired
        if credential.is_expired():
            self.logger.warning(f"Credential for agent {credential.agent_id} is expired")
            return ValidationResult.EXPIRED
            
        # Check if timestamp is valid (not too old or in the future)
        current_time = time.time()
        max_age = self.config.get("max_message_age", 300)  # 5 minutes
        
        if current_time - timestamp > max_age:
            self.logger.warning(f"Message {message.id} is too old")
            return ValidationResult.EXPIRED
            
        if timestamp > current_time + 60:  # Allow for some clock skew
            self.logger.warning(f"Message {message.id} has future timestamp")
            return ValidationResult.INVALID_SIGNATURE
            
        # Verify signature
        message_data = {
            "id": message.id,
            "sender": message.sender,
            "recipient": message.recipient,
            "timestamp": timestamp
        }
        
        message_json = json.dumps(message_data, sort_keys=True)
        expected_signature = self._create_signature(message_json, credential.secret_key)
        
        if signature != expected_signature:
            self.logger.warning(f"Invalid signature for message {message.id}")
            return ValidationResult.INVALID_SIGNATURE
            
        return ValidationResult.VALID
    
    def _validate_message_authorization(self, message: Message) -> ValidationResult:
        """Validate message authorization"""
        # Get message type and resource
        message_type = message.content.get("type", "unknown")
        
        # Determine resource based on message type
        resource = "unknown"
        
        if message_type.startswith("plan"):
            resource = "plan"
        elif message_type.startswith("task") or message_type.startswith("execute"):
            resource = "task"
        elif message_type.startswith("review"):
            resource = "review"
        elif message_type.startswith("workflow"):
            resource = "workflow"
        elif message_type.startswith("notion") or message_type.startswith("document"):
            resource = "notion"
        
        # Add more specific resource identification based on message content
        if "task_id" in message.content:
            resource = f"{resource}.{message.content['task_id']}"
            
        elif "workflow_id" in message.content:
            resource = f"{resource}.{message.content['workflow_id']}"
            
        # Check permission level based on operation
        required_level = PermissionLevel.READ
        
        if message_type.endswith("_request") or message_type.startswith("create"):
            required_level = PermissionLevel.WRITE
            
        if message_type.startswith("execute") or message_type.endswith("_execute"):
            required_level = PermissionLevel.EXECUTE
            
        # Check if sender has required permission
        if not self.check_permission(message.sender, resource, required_level):
            self.logger.warning(
                f"Agent {message.sender} does not have {required_level.name} permission for resource {resource}"
            )
            return ValidationResult.UNAUTHORIZED
            
        return ValidationResult.VALID
    
    def _create_signature(self, message: str, secret_key: str) -> str:
        """Create a message signature using HMAC-SHA256"""
        h = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        )
        return base64.b64encode(h.digest()).decode()
    
    def save_credentials_to_file(self, filepath: str) -> bool:
        """Save agent credentials to a file"""
        try:
            with open(filepath, "w") as f:
                credentials_data = [
                    credential.to_dict() for credential in self.credentials.values()
                ]
                json.dump(credentials_data, f, indent=2)
                
            self.logger.info(f"Saved {len(self.credentials)} credentials to {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving credentials to file: {str(e)}")
            return False
    
    def load_credentials_from_file(self, filepath: str) -> bool:
        """Load agent credentials from a file"""
        try:
            with open(filepath, "r") as f:
                credentials_data = json.load(f)
                
            for cred_data in credentials_data:
                try:
                    credential = AgentCredential.from_dict(cred_data)
                    self.credentials[credential.agent_id] = credential
                except Exception as e:
                    self.logger.error(f"Error loading credential: {str(e)}")
                    
            self.logger.info(f"Loaded {len(credentials_data)} credentials from {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading credentials from file: {str(e)}")
            return False
    
    def save_policies_to_file(self, filepath: str) -> bool:
        """Save access policies to a file"""
        try:
            with open(filepath, "w") as f:
                policies_data = [policy.to_dict() for policy in self.policies.values()]
                json.dump(policies_data, f, indent=2)
                
            self.logger.info(f"Saved {len(self.policies)} policies to {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving policies to file: {str(e)}")
            return False
    
    def load_policies_from_file(self, filepath: str) -> bool:
        """Load access policies from a file"""
        try:
            with open(filepath, "r") as f:
                policies_data = json.load(f)
                
            for policy_data in policies_data:
                try:
                    policy = AccessPolicy.from_dict(policy_data)
                    self.policies[policy.policy_id] = policy
                except Exception as e:
                    self.logger.error(f"Error loading policy: {str(e)}")
                    
            self.logger.info(f"Loaded {len(policies_data)} policies from {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error loading policies from file: {str(e)}")
            return False

class SecureMessageBus:
    """
    A secure wrapper around the MessageBus that enforces authentication,
    authorization, and message validation.
    """
    
    def __init__(
        self,
        message_bus: MessageBus,
        security_manager: AgentSecurityManager
    ):
        self.message_bus = message_bus
        self.security_manager = security_manager
        self.logger = logging.getLogger('secure_message_bus')
    
    async def publish(self, message: Message) -> List[Optional[Message]]:
        """Publish a message securely"""
        # Sign the message
        signed_message = self.security_manager.sign_message(message, message.sender)
        
        # Validate the message
        validation_result = self.security_manager.validate_message(signed_message)
        if validation_result != ValidationResult.VALID:
            self.logger.warning(
                f"Message {message.id} validation failed: {validation_result.value}"
            )
            return []
        
        # Publish the message
        return await self.message_bus.publish(signed_message)
    
    async def send(self, message: Message) -> Optional[Message]:
        """Send a message securely"""
        # Sign the message
        signed_message = self.security_manager.sign_message(message, message.sender)
        
        # Validate the message
        validation_result = self.security_manager.validate_message(signed_message)
        if validation_result != ValidationResult.VALID:
            self.logger.warning(
                f"Message {message.id} validation failed: {validation_result.value}"
            )
            return None
        
        # Send the message
        return await self.message_bus.send(signed_message)
    
    def subscribe(self, agent_id: str, message_types: List[MessageType]) -> None:
        """Subscribe an agent to specific message types"""
        self.message_bus.subscribe(agent_id, message_types)
    
    def unsubscribe(self, agent_id: str, message_types: Optional[List[MessageType]] = None) -> None:
        """Unsubscribe an agent from specific message types or all if not specified"""
        self.message_bus.unsubscribe(agent_id, message_types)
    
    def register_handler(
        self, 
        agent_id: str, 
        message_type: MessageType, 
        handler: Callable[[Message], Union[Dict[str, Any], None, asyncio.Future]]
    ) -> None:
        """Register a handler for a specific message type"""
        self.message_bus.register_handler(agent_id, message_type, handler)
    
    def get_message_history(self, trace_id: Optional[str] = None) -> List[Message]:
        """Get the message history, optionally filtered by trace_id"""
        return self.message_bus.get_message_history(trace_id)
    
    def clear_message_history(self, older_than: Optional[float] = None) -> int:
        """Clear message history, optionally only messages older than a timestamp"""
        return self.message_bus.clear_message_history(older_than)

class SecureAgentManager:
    """
    A secure wrapper around the AgentManager that enforces authentication,
    authorization, and message validation.
    """
    
    def __init__(
        self,
        agent_manager: 'AgentManager',
        security_manager: AgentSecurityManager
    ):
        self.agent_manager = agent_manager
        self.security_manager = security_manager
        self.logger = logging.getLogger('secure_agent_manager')
    
    async def route_message(self, message: Message) -> Optional[Message]:
        """Route a message securely"""
        # Sign the message
        signed_message = self.security_manager.sign_message(message, message.sender)
        
        # Validate the message
        validation_result = self.security_manager.validate_message(signed_message)
        if validation_result != ValidationResult.VALID:
            self.logger.warning(
                f"Message {message.id} validation failed: {validation_result.value}"
            )
            return None
        
        # Route the message
        return await self.agent_manager.route_message(signed_message)
    
    async def broadcast_message(
        self,
        sender: str,
        content: Dict[str, Any],
        recipients: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
    ) -> Dict[str, Optional[Message]]:
        """Broadcast a message securely to multiple agents"""
        # Create message results dictionary
        results = {}
        
        # Determine recipients
        if recipients is None:
            recipients = [
                agent_id for agent_id in self.agent_manager.agents
                if agent_id != sender and (exclude is None or agent_id not in exclude)
            ]
        
        # Send messages to each recipient
        for recipient in recipients:
            # Create message
            message = Message(
                sender=sender,
                recipient=recipient,
                content=content,
                priority=priority
            )
            
            # Sign and validate message
            signed_message = self.security_manager.sign_message(message, sender)
            validation_result = self.security_manager.validate_message(signed_message)
            
            if validation_result != ValidationResult.VALID:
                self.logger.warning(
                    f"Message to {recipient} validation failed: {validation_result.value}"
                )
                results[recipient] = None
                continue
            
            # Route message
            response = await self.agent_manager.route_message(signed_message)
            results[recipient] = response
        
        return results
    
    def register_agent(self, agent: Agent) -> None:
        """Register an agent securely"""
        # Generate credential for agent if needed
        if not self.security_manager.get_agent_credential(agent.id):
            self.security_manager.generate_agent_credential(agent.id)
            
        # Register agent
        self.agent_manager.register_agent(agent)
    
    async def initialize(self) -> bool:
        """Initialize the agent manager securely"""
        return await self.agent_manager.initialize()
    
    async def start(self) -> None:
        """Start the agent manager securely"""
        await self.agent_manager.start()
    
    async def stop(self) -> None:
        """Stop the agent manager securely"""
        await self.agent_manager.stop()
    
    async def get_agent_states(self) -> Dict[str, Dict[str, Any]]:
        """Get the current state of all agents securely"""
        return await self.agent_manager.get_agent_states()