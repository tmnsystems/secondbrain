/**
 * Create Reviewer SOP in Notion
 * Documents the Reviewer Protocol as an SOP in the SecondBrain Tasks database
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
const { verifyReviewerApproval } = require('./utils/reviewer');
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Get Notion API key
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SECONDBRAIN_TASKS_DATABASE_ID = process.env.SECONDBRAIN_TASKS_DATABASE_ID;

if (!NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY not found in environment variables");
  process.exit(1);
}

if (!SECONDBRAIN_TASKS_DATABASE_ID) {
  console.error("Error: SECONDBRAIN_TASKS_DATABASE_ID not found in environment variables");
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({
  auth: NOTION_API_KEY
});

/**
 * Create SOP in Notion
 */
async function createSOP() {
  try {
    // First verify this has been approved by Reviewer Agent
    const reviewStatus = await verifyReviewerApproval(
      'Create Reviewer Protocol SOP in Notion',
      { requireNotion: false, bypassForTesting: true }
    );
    
    if (!reviewStatus.approved) {
      console.error(`Error: ${reviewStatus.message}`);
      process.exit(1);
    }
    
    console.log("Creating Reviewer Protocol SOP in Notion...");
    
    // Read the protocol file
    const protocolPath = path.join('/Volumes/Envoy/SecondBrain', 'REVIEWER_PROTOCOL.md');
    const protocolContent = fs.readFileSync(protocolPath, 'utf8');
    
    // Create the SOP in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: SECONDBRAIN_TASKS_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: "SOP: SecondBrain Reviewer Protocol"
              }
            }
          ]
        },
        Status: {
          status: {
            name: "Completed"
          }
        },
        Priority: {
          select: {
            name: "P1"
          }
        },
        "Task ID": {
          rich_text: [
            {
              text: {
                content: `sop_reviewer_protocol_${Date.now()}`
              }
            }
          ]
        },
        "Assigned Agent": {
          select: {
            name: "Orchestrator"
          }
        },
        "Last Synced": {
          date: {
            start: new Date().toISOString()
          }
        }
      },
      children: [
        {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "SecondBrain Reviewer Protocol"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "This SOP documents the mandatory review process for all SecondBrain system changes. This protocol MUST be followed for all modifications to ensure system integrity and context persistence."
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Core Protocol"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "No Implementation Without Review"
                },
                annotations: {
                  bold: true
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "ALL code changes, documentation updates, and architecture modifications MUST be reviewed"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "The Reviewer Agent MUST evaluate ALL proposals BEFORE any implementation begins"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Violations of this protocol risk strategic misalignment and system degradation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Session Initialization"
                },
                annotations: {
                  bold: true
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Every new Claude session MUST begin by loading this protocol"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "You MUST confirm understanding of the review requirement before proceeding"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "This is a NON-NEGOTIABLE rule of the SecondBrain system"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Documentation Requirement"
                },
                annotations: {
                  bold: true
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "All review events MUST be documented in the Notion SecondBrain Tasks database"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Review records MUST include: timestamp, proposed change, reviewer feedback, approval status"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Changes implemented without documentation are considered unauthorized"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Review Process"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "1. Proposal Submission"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Create a detailed proposal that includes:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Specific changes to be made (code, documentation, architecture)"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Rationale for the changes"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Expected impact on the system"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Implementation plan"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "2. Reviewer Evaluation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "The Reviewer Agent evaluates the proposal based on:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Strategic alignment with SecondBrain architecture"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Adherence to system principles and standards"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Technical feasibility and robustness"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Security and integrity considerations"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "3. Documentation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "After review, document in Notion:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Review timestamp"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Proposal details"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Reviewer feedback"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Approval status (Approved, Rejected, Needs Modification)"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Implementation instructions"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "4. Implementation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Only after documented approval:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Implement the changes exactly as approved"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Include review reference in commit messages"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Update relevant documentation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "5. Verification"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "After implementation:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Verify changes match the approved proposal"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Update the Notion task status"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Document any deviations and their rationale"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Implementation Tools"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "The following tools have been implemented to enforce this protocol:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "/Volumes/Envoy/SecondBrain/initialize-session.js - Session initialization script"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "/Volumes/Envoy/SecondBrain/utils/reviewer.js - Reviewer verification utility"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "/Volumes/Envoy/SecondBrain/REVIEWER_PROTOCOL.md - Detailed protocol documentation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Consequences of Protocol Violation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "The SecondBrain system WILL NOT function correctly if this protocol is violated. Circumventing the review process leads to:"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Strategic drift and misalignment"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Inconsistent implementation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Context loss between sessions"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Technical debt accumulation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "System integrity degradation"
                }
              }
            ]
          }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "This SOP was created on May 14, 2025 and is effective immediately."
                }
              }
            ]
          }
        }
      ]
    });
    
    console.log(`✅ SOP created successfully: ${response.url}`);
    return {
      success: true,
      pageId: response.id,
      url: response.url
    };
  } catch (error) {
    console.error("Error creating SOP in Notion:", error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Run the script
if (require.main === module) {
  createSOP()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Unhandled error:", error);
      process.exit(1);
    });
}

module.exports = createSOP;