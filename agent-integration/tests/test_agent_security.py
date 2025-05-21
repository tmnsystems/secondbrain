import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
import hashlib
import base64
import time
from datetime import datetime, timedelta

# Add the src directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from agent_security import (
    PermissionLevel, ValidationResult, AgentCredential, AccessPolicy,
    AgentSecurityManager, TokenInfo, MessageSignature
)

class TestAgentSecurity(unittest.TestCase):
    
    def setUp(self):
        # Create a security manager
        self.security_manager = AgentSecurityManager(
            secret_key="test_secret_key",
            token_expiry=3600,  # 1 hour
            access_policies=[
                AccessPolicy(
                    agent_id="agent1",
                    permissions=[
                        {"resource": "messages", "action": "send", "target_agents": ["agent2", "agent3"]},
                        {"resource": "workflows", "action": "execute", "workflow_ids": ["workflow1", "workflow2"]}
                    ],
                    level=PermissionLevel.STANDARD
                ),
                AccessPolicy(
                    agent_id="agent2",
                    permissions=[
                        {"resource": "messages", "action": "send", "target_agents": ["agent1"]},
                        {"resource": "workflows", "action": "view", "workflow_ids": ["workflow1"]}
                    ],
                    level=PermissionLevel.RESTRICTED
                ),
                AccessPolicy(
                    agent_id="admin",
                    permissions=[
                        {"resource": "*", "action": "*", "target_agents": ["*"]},
                        {"resource": "*", "action": "*", "workflow_ids": ["*"]}
                    ],
                    level=PermissionLevel.ADMIN
                )
            ]
        )
    
    def test_generate_agent_credential(self):
        # Test generating credentials for an agent
        agent_id = "test_agent"
        
        # Generate credentials
        credential = self.security_manager.generate_agent_credential(agent_id)
        
        # Check that the credential was generated correctly
        self.assertEqual(credential.agent_id, agent_id)
        self.assertIsNotNone(credential.api_key)
        self.assertIsNotNone(credential.api_secret)
        
        # Check that the credential was stored in the security manager
        self.assertIn(agent_id, self.security_manager.credentials)
        self.assertEqual(self.security_manager.credentials[agent_id].api_key, credential.api_key)
        self.assertEqual(self.security_manager.credentials[agent_id].api_secret, credential.api_secret)
    
    def test_generate_token(self):
        # Test generating a token for an agent
        agent_id = "token_agent"
        
        # Generate credentials
        credential = self.security_manager.generate_agent_credential(agent_id)
        
        # Generate a token
        token = self.security_manager.generate_token(agent_id, credential.api_key, credential.api_secret)
        
        # Check that the token is not None
        self.assertIsNotNone(token)
        
        # Decode and verify the token
        token_info = self.security_manager.verify_token(token)
        
        # Check that the token was verified correctly
        self.assertEqual(token_info.agent_id, agent_id)
        self.assertIsInstance(token_info.expiry, float)
        self.assertTrue(token_info.expiry > time.time())  # Token should not be expired
    
    def test_sign_message(self):
        # Test signing a message
        agent_id = "signing_agent"
        message = {"text": "Hello, world!", "timestamp": time.time()}
        
        # Generate credentials
        credential = self.security_manager.generate_agent_credential(agent_id)
        
        # Sign the message
        signature = self.security_manager.sign_message(agent_id, message, credential.api_secret)
        
        # Check that the signature is not None
        self.assertIsNotNone(signature)
        
        # Verify the signature
        is_valid = self.security_manager.verify_signature(agent_id, message, signature)
        
        # Check that the signature was verified correctly
        self.assertTrue(is_valid)
    
    def test_validate_message(self):
        # Test validating a message
        source_agent = "agent1"
        target_agent = "agent2"
        message = {"text": "Hello, world!", "timestamp": time.time()}
        
        # Generate credentials for source agent
        credential = self.security_manager.generate_agent_credential(source_agent)
        
        # Generate a token
        token = self.security_manager.generate_token(source_agent, credential.api_key, credential.api_secret)
        
        # Sign the message
        signature = self.security_manager.sign_message(source_agent, message, credential.api_secret)
        
        # Create a signed message
        signed_message = {
            "source_agent": source_agent,
            "target_agent": target_agent,
            "content": message,
            "token": token,
            "signature": signature
        }
        
        # Validate the message
        result = self.security_manager.validate_message(signed_message)
        
        # Check that the message was validated correctly
        self.assertEqual(result.is_valid, True)
        self.assertEqual(result.token_valid, True)
        self.assertEqual(result.signature_valid, True)
        self.assertEqual(result.permission_valid, True)
        self.assertIsNone(result.error)
    
    def test_validate_message_invalid_token(self):
        # Test validating a message with an invalid token
        source_agent = "agent1"
        target_agent = "agent2"
        message = {"text": "Hello, world!", "timestamp": time.time()}
        
        # Generate credentials for source agent
        credential = self.security_manager.generate_agent_credential(source_agent)
        
        # Generate an expired token
        with patch('time.time', return_value=time.time() - 7200):  # 2 hours in the past
            token = self.security_manager.generate_token(source_agent, credential.api_key, credential.api_secret)
        
        # Sign the message
        signature = self.security_manager.sign_message(source_agent, message, credential.api_secret)
        
        # Create a signed message
        signed_message = {
            "source_agent": source_agent,
            "target_agent": target_agent,
            "content": message,
            "token": token,
            "signature": signature
        }
        
        # Validate the message
        result = self.security_manager.validate_message(signed_message)
        
        # Check that the message was rejected due to invalid token
        self.assertEqual(result.is_valid, False)
        self.assertEqual(result.token_valid, False)
        self.assertEqual(result.signature_valid, True)
        self.assertEqual(result.permission_valid, True)
        self.assertIn("expired", result.error)
    
    def test_validate_message_invalid_signature(self):
        # Test validating a message with an invalid signature
        source_agent = "agent1"
        target_agent = "agent2"
        message = {"text": "Hello, world!", "timestamp": time.time()}
        
        # Generate credentials for source agent
        credential = self.security_manager.generate_agent_credential(source_agent)
        
        # Generate a token
        token = self.security_manager.generate_token(source_agent, credential.api_key, credential.api_secret)
        
        # Create an invalid signature
        signature = "invalid_signature"
        
        # Create a signed message
        signed_message = {
            "source_agent": source_agent,
            "target_agent": target_agent,
            "content": message,
            "token": token,
            "signature": signature
        }
        
        # Validate the message
        result = self.security_manager.validate_message(signed_message)
        
        # Check that the message was rejected due to invalid signature
        self.assertEqual(result.is_valid, False)
        self.assertEqual(result.token_valid, True)
        self.assertEqual(result.signature_valid, False)
        self.assertEqual(result.permission_valid, True)
        self.assertIn("signature", result.error)
    
    def test_validate_message_invalid_permission(self):
        # Test validating a message with invalid permissions
        source_agent = "agent1"
        target_agent = "agent4"  # Not in the allowed target_agents list
        message = {"text": "Hello, world!", "timestamp": time.time()}
        
        # Generate credentials for source agent
        credential = self.security_manager.generate_agent_credential(source_agent)
        
        # Generate a token
        token = self.security_manager.generate_token(source_agent, credential.api_key, credential.api_secret)
        
        # Sign the message
        signature = self.security_manager.sign_message(source_agent, message, credential.api_secret)
        
        # Create a signed message
        signed_message = {
            "source_agent": source_agent,
            "target_agent": target_agent,
            "content": message,
            "token": token,
            "signature": signature
        }
        
        # Validate the message
        result = self.security_manager.validate_message(signed_message)
        
        # Check that the message was rejected due to invalid permissions
        self.assertEqual(result.is_valid, False)
        self.assertEqual(result.token_valid, True)
        self.assertEqual(result.signature_valid, True)
        self.assertEqual(result.permission_valid, False)
        self.assertIn("permission", result.error)
    
    def test_admin_permissions(self):
        # Test validating a message with admin permissions
        source_agent = "admin"
        target_agent = "any_agent"  # Admin can send to any agent
        message = {"text": "Hello, world!", "timestamp": time.time()}
        
        # Generate credentials for admin agent
        credential = self.security_manager.generate_agent_credential(source_agent)
        
        # Generate a token
        token = self.security_manager.generate_token(source_agent, credential.api_key, credential.api_secret)
        
        # Sign the message
        signature = self.security_manager.sign_message(source_agent, message, credential.api_secret)
        
        # Create a signed message
        signed_message = {
            "source_agent": source_agent,
            "target_agent": target_agent,
            "content": message,
            "token": token,
            "signature": signature
        }
        
        # Validate the message
        result = self.security_manager.validate_message(signed_message)
        
        # Check that the message was validated correctly (admin has all permissions)
        self.assertEqual(result.is_valid, True)
        self.assertEqual(result.token_valid, True)
        self.assertEqual(result.signature_valid, True)
        self.assertEqual(result.permission_valid, True)
        self.assertIsNone(result.error)
    
    def test_check_workflow_permission(self):
        # Test checking workflow permissions
        
        # Check if agent1 can execute workflow1
        has_permission = self.security_manager.check_workflow_permission("agent1", "execute", "workflow1")
        self.assertTrue(has_permission)
        
        # Check if agent1 can execute workflow3 (not in allowed list)
        has_permission = self.security_manager.check_workflow_permission("agent1", "execute", "workflow3")
        self.assertFalse(has_permission)
        
        # Check if agent2 can view workflow1
        has_permission = self.security_manager.check_workflow_permission("agent2", "view", "workflow1")
        self.assertTrue(has_permission)
        
        # Check if agent2 can execute workflow1 (not allowed action)
        has_permission = self.security_manager.check_workflow_permission("agent2", "execute", "workflow1")
        self.assertFalse(has_permission)
        
        # Check if admin can do anything with any workflow
        has_permission = self.security_manager.check_workflow_permission("admin", "delete", "any_workflow")
        self.assertTrue(has_permission)
    
    def test_revoke_agent_credential(self):
        # Test revoking agent credentials
        agent_id = "agent_to_revoke"
        
        # Generate credentials
        credential = self.security_manager.generate_agent_credential(agent_id)
        
        # Check that the credential was stored
        self.assertIn(agent_id, self.security_manager.credentials)
        
        # Revoke the credential
        self.security_manager.revoke_agent_credential(agent_id)
        
        # Check that the credential was removed
        self.assertNotIn(agent_id, self.security_manager.credentials)
        
        # Generate a token with the revoked credentials
        token = self.security_manager.generate_token(agent_id, credential.api_key, credential.api_secret)
        
        # Token generation should fail for revoked credentials
        self.assertIsNone(token)
    
    def test_update_access_policy(self):
        # Test updating access policies
        agent_id = "agent_to_update"
        
        # Create an initial policy
        initial_policy = AccessPolicy(
            agent_id=agent_id,
            permissions=[
                {"resource": "messages", "action": "send", "target_agents": ["agent1"]}
            ],
            level=PermissionLevel.RESTRICTED
        )
        
        # Add the policy to the security manager
        self.security_manager.access_policies.append(initial_policy)
        
        # Check if the agent can send messages to agent1
        has_permission = self.security_manager.check_message_permission(agent_id, "send", "agent1")
        self.assertTrue(has_permission)
        
        # Check if the agent can send messages to agent2 (not in allowed list)
        has_permission = self.security_manager.check_message_permission(agent_id, "send", "agent2")
        self.assertFalse(has_permission)
        
        # Update the policy
        updated_policy = AccessPolicy(
            agent_id=agent_id,
            permissions=[
                {"resource": "messages", "action": "send", "target_agents": ["agent1", "agent2"]}
            ],
            level=PermissionLevel.STANDARD
        )
        
        # Update the policy in the security manager
        self.security_manager.update_access_policy(updated_policy)
        
        # Check if the agent can now send messages to agent2
        has_permission = self.security_manager.check_message_permission(agent_id, "send", "agent2")
        self.assertTrue(has_permission)
        
        # Check that the permission level was updated
        policy = next((p for p in self.security_manager.access_policies if p.agent_id == agent_id), None)
        self.assertEqual(policy.level, PermissionLevel.STANDARD)
    
    def test_get_agent_policy(self):
        # Test getting an agent's access policy
        
        # Get agent1's policy
        policy = self.security_manager.get_agent_policy("agent1")
        
        # Check that the policy was retrieved correctly
        self.assertEqual(policy.agent_id, "agent1")
        self.assertEqual(len(policy.permissions), 2)
        self.assertEqual(policy.level, PermissionLevel.STANDARD)
        
        # Try to get a non-existent policy
        policy = self.security_manager.get_agent_policy("non_existent_agent")
        
        # Check that None was returned
        self.assertIsNone(policy)
    
    def test_token_info_init(self):
        # Test creating a TokenInfo
        agent_id = "test_agent"
        expiry = time.time() + 3600
        
        # Create a TokenInfo
        token_info = TokenInfo(agent_id=agent_id, expiry=expiry)
        
        # Check that the TokenInfo was created correctly
        self.assertEqual(token_info.agent_id, agent_id)
        self.assertEqual(token_info.expiry, expiry)
    
    def test_token_info_to_dict(self):
        # Test converting TokenInfo to a dictionary
        agent_id = "test_agent"
        expiry = time.time() + 3600
        
        # Create a TokenInfo
        token_info = TokenInfo(agent_id=agent_id, expiry=expiry)
        
        # Convert to a dictionary
        token_dict = token_info.to_dict()
        
        # Check that the dictionary was created correctly
        self.assertEqual(token_dict["agent_id"], agent_id)
        self.assertEqual(token_dict["expiry"], expiry)
    
    def test_token_info_from_dict(self):
        # Test creating TokenInfo from a dictionary
        agent_id = "test_agent"
        expiry = time.time() + 3600
        
        # Create a dictionary
        token_dict = {"agent_id": agent_id, "expiry": expiry}
        
        # Create TokenInfo from the dictionary
        token_info = TokenInfo.from_dict(token_dict)
        
        # Check that the TokenInfo was created correctly
        self.assertEqual(token_info.agent_id, agent_id)
        self.assertEqual(token_info.expiry, expiry)
    
    def test_token_info_is_expired(self):
        # Test checking if a token is expired
        agent_id = "test_agent"
        
        # Create a TokenInfo with a future expiry
        future_expiry = time.time() + 3600
        token_info = TokenInfo(agent_id=agent_id, expiry=future_expiry)
        
        # Check that the token is not expired
        self.assertFalse(token_info.is_expired())
        
        # Create a TokenInfo with a past expiry
        past_expiry = time.time() - 3600
        token_info = TokenInfo(agent_id=agent_id, expiry=past_expiry)
        
        # Check that the token is expired
        self.assertTrue(token_info.is_expired())
    
    def test_agent_credential_init(self):
        # Test creating an AgentCredential
        agent_id = "test_agent"
        api_key = "test_api_key"
        api_secret = "test_api_secret"
        
        # Create an AgentCredential
        credential = AgentCredential(agent_id=agent_id, api_key=api_key, api_secret=api_secret)
        
        # Check that the AgentCredential was created correctly
        self.assertEqual(credential.agent_id, agent_id)
        self.assertEqual(credential.api_key, api_key)
        self.assertEqual(credential.api_secret, api_secret)
    
    def test_access_policy_init(self):
        # Test creating an AccessPolicy
        agent_id = "test_agent"
        permissions = [
            {"resource": "messages", "action": "send", "target_agents": ["agent1", "agent2"]},
            {"resource": "workflows", "action": "view", "workflow_ids": ["workflow1"]}
        ]
        level = PermissionLevel.STANDARD
        
        # Create an AccessPolicy
        policy = AccessPolicy(agent_id=agent_id, permissions=permissions, level=level)
        
        # Check that the AccessPolicy was created correctly
        self.assertEqual(policy.agent_id, agent_id)
        self.assertEqual(policy.permissions, permissions)
        self.assertEqual(policy.level, level)
    
    def test_validation_result_init(self):
        # Test creating a ValidationResult
        is_valid = True
        token_valid = True
        signature_valid = True
        permission_valid = True
        error = None
        
        # Create a ValidationResult
        result = ValidationResult(
            is_valid=is_valid,
            token_valid=token_valid,
            signature_valid=signature_valid,
            permission_valid=permission_valid,
            error=error
        )
        
        # Check that the ValidationResult was created correctly
        self.assertEqual(result.is_valid, is_valid)
        self.assertEqual(result.token_valid, token_valid)
        self.assertEqual(result.signature_valid, signature_valid)
        self.assertEqual(result.permission_valid, permission_valid)
        self.assertEqual(result.error, error)
    
    def test_message_signature_init(self):
        # Test creating a MessageSignature
        signature_value = "test_signature"
        timestamp = time.time()
        
        # Create a MessageSignature
        signature = MessageSignature(value=signature_value, timestamp=timestamp)
        
        # Check that the MessageSignature was created correctly
        self.assertEqual(signature.value, signature_value)
        self.assertEqual(signature.timestamp, timestamp)
    
    def test_message_signature_to_dict(self):
        # Test converting MessageSignature to a dictionary
        signature_value = "test_signature"
        timestamp = time.time()
        
        # Create a MessageSignature
        signature = MessageSignature(value=signature_value, timestamp=timestamp)
        
        # Convert to a dictionary
        signature_dict = signature.to_dict()
        
        # Check that the dictionary was created correctly
        self.assertEqual(signature_dict["value"], signature_value)
        self.assertEqual(signature_dict["timestamp"], timestamp)
    
    def test_message_signature_from_dict(self):
        # Test creating MessageSignature from a dictionary
        signature_value = "test_signature"
        timestamp = time.time()
        
        # Create a dictionary
        signature_dict = {"value": signature_value, "timestamp": timestamp}
        
        # Create MessageSignature from the dictionary
        signature = MessageSignature.from_dict(signature_dict)
        
        # Check that the MessageSignature was created correctly
        self.assertEqual(signature.value, signature_value)
        self.assertEqual(signature.timestamp, timestamp)
    
    def test_message_signature_is_expired(self):
        # Test checking if a signature is expired
        signature_value = "test_signature"
        
        # Create a MessageSignature with a recent timestamp
        recent_timestamp = time.time() - 60  # 1 minute ago
        signature = MessageSignature(value=signature_value, timestamp=recent_timestamp)
        
        # Check that the signature is not expired (default max_age is 5 minutes)
        self.assertFalse(signature.is_expired())
        
        # Create a MessageSignature with an old timestamp
        old_timestamp = time.time() - 600  # 10 minutes ago
        signature = MessageSignature(value=signature_value, timestamp=old_timestamp)
        
        # Check that the signature is expired
        self.assertTrue(signature.is_expired())
        
        # Check with custom max_age
        self.assertFalse(signature.is_expired(max_age=3600))  # 1 hour

if __name__ == '__main__':
    unittest.main()