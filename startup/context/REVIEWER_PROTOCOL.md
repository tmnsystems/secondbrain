# SecondBrain Reviewer Protocol

## CRITICAL: ALL CHANGES MUST BE REVIEWED BEFORE IMPLEMENTATION

This document defines the mandatory review process for all SecondBrain system changes.

## Core Protocol

1. **No Implementation Without Review**
   - ALL code changes, documentation updates, and architecture modifications MUST be reviewed
   - The Reviewer Agent MUST evaluate ALL proposals BEFORE any implementation begins
   - Violations of this protocol risk strategic misalignment and system degradation

2. **Session Initialization**
   - Every new Claude session MUST begin by loading this protocol
   - You MUST confirm understanding of the review requirement before proceeding
   - This is a NON-NEGOTIABLE rule of the SecondBrain system

3. **Documentation Requirement**
   - All review events MUST be documented in the Notion SecondBrain Tasks database
   - Review records MUST include: timestamp, proposed change, reviewer feedback, approval status
   - Changes implemented without documentation are considered unauthorized

## Review Process

### 1. Proposal Submission

Create a detailed proposal that includes:
- Specific changes to be made (code, documentation, architecture)
- Rationale for the changes
- Expected impact on the system
- Implementation plan

### 2. Reviewer Evaluation

The Reviewer Agent evaluates the proposal based on:
- Strategic alignment with SecondBrain architecture
- Adherence to system principles and standards
- Technical feasibility and robustness
- Security and integrity considerations

### 3. Documentation

After review, document in Notion:
- Review timestamp
- Proposal details
- Reviewer feedback
- Approval status (Approved, Rejected, Needs Modification)
- Implementation instructions

### 4. Implementation

Only after documented approval:
- Implement the changes exactly as approved
- Include review reference in commit messages
- Update relevant documentation

### 5. Verification

After implementation:
- Verify changes match the approved proposal
- Update the Notion task status
- Document any deviations and their rationale

## Technical Implementation

### Review Verification

All scripts MUST call the verification function:

```javascript
// In all implementation scripts
const { verifyReviewerApproval } = require('../utils/reviewer');

// At the beginning of any implementation function
async function implementChange() {
  const reviewStatus = await verifyReviewerApproval('CHANGE_DESCRIPTION');
  if (!reviewStatus.approved) {
    console.error(`ERROR: Changes not approved by Reviewer Agent. ${reviewStatus.message}`);
    process.exit(1);
  }
  
  // Implementation continues only if approved...
}
```

### Structured Logging

All logs MUST include reviewer status:

```javascript
// Example log entry
const logEntry = {
  timestamp: new Date().toISOString(),
  action: 'UPDATE_DATABASE_SCHEMA',
  status: 'COMPLETED',
  reviewer: {
    consulted: true,
    approvalId: 'REV-2025-05-14-001',
    approvalStatus: 'APPROVED'
  },
  details: {
    // Action-specific details
  }
};
```

## Enforcement

The SecondBrain system WILL NOT function correctly if this protocol is violated. Circumventing the review process leads to:

1. Strategic drift and misalignment
2. Inconsistent implementation
3. Context loss between sessions
4. Technical debt accumulation
5. System integrity degradation

---

**This protocol was approved by the Reviewer Agent on May 14, 2025.**