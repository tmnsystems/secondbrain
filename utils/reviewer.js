/**
 * Reviewer Verification Utility
 * This utility provides functions to verify that changes have been
 * approved by the Reviewer Agent before implementation.
 */

const fs = require('fs');
const path = require('path');
let Client;
try {
  ({ Client } = require('@notionhq/client'));
} catch {
  Client = null;
}
require('dotenv').config({ path: '/Volumes/Envoy/SecondBrain/secondbrain_api_keys.env' });

// Initialize Notion client if available
// Initialize Notion client if available
let notion = null;
if (Client && process.env.NOTION_API_KEY) {
  notion = new Client({ auth: process.env.NOTION_API_KEY });
}

// Default review status log location
const REVIEW_LOG_DIR = path.join('/Volumes/Envoy/SecondBrain', 'review_logs');

// Ensure review log directory exists
if (!fs.existsSync(REVIEW_LOG_DIR)) {
  fs.mkdirSync(REVIEW_LOG_DIR, { recursive: true });
}

/**
 * Check if a change has been approved by the Reviewer Agent
 * @param {string} changeDescription - Description of the change
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Approval status
 */
async function verifyReviewerApproval(changeDescription, options = {}) {
  try {
    // Default options
    const opts = {
      requireNotion: true,
      reviewerId: 'Reviewer',
      ...options
    };
    
    // Create a unique identifier for the change
    const changeId = `${changeDescription.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
    
    
    // Check local review log first
    const localReviewStatus = checkLocalReviewLog(changeId);
    if (localReviewStatus.found && localReviewStatus.approved) {
      return {
        approved: true,
        message: 'Approved based on local review log',
        reviewId: localReviewStatus.reviewId,
        timestamp: localReviewStatus.timestamp,
        reviewer: localReviewStatus.reviewer
      };
    }
    
    // Check Notion if available
    if (notion && opts.requireNotion) {
      const notionReviewStatus = await checkNotionReviewStatus(changeDescription);
      if (notionReviewStatus.found && notionReviewStatus.approved) {
        // Update local log for future reference
        saveLocalReviewLog(changeId, notionReviewStatus);
        
        return {
          approved: true,
          message: 'Approved based on Notion review record',
          reviewId: notionReviewStatus.reviewId,
          timestamp: notionReviewStatus.timestamp,
          reviewer: notionReviewStatus.reviewer
        };
      }
    }
    
    // If we get here, no approval was found
    return {
      approved: false,
      message: 'No reviewer approval found. Please consult the Reviewer Agent before implementing this change.',
      changeId
    };
  } catch (error) {
    console.error('Error verifying reviewer approval:', error);
    return {
      approved: false,
      message: `Error verifying approval: ${error.message}`,
      error: error.toString()
    };
  }
}

/**
 * Check local review log for approval
 * @param {string} changeId - Unique identifier for the change
 * @returns {Object} - Local review status
 */
function checkLocalReviewLog(changeId) {
  try {
    const logPath = path.join(REVIEW_LOG_DIR, `${changeId}.json`);
    
    if (fs.existsSync(logPath)) {
      const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      
      return {
        found: true,
        approved: logData.approved === true,
        reviewId: logData.reviewId,
        timestamp: logData.timestamp,
        reviewer: logData.reviewer
      };
    }
    
    return {
      found: false
    };
  } catch (error) {
    console.warn(`Warning: Could not check local review log: ${error.message}`);
    return {
      found: false,
      error: error.toString()
    };
  }
}

/**
 * Save review approval to local log
 * @param {string} changeId - Unique identifier for the change
 * @param {Object} reviewStatus - Review status information
 */
function saveLocalReviewLog(changeId, reviewStatus) {
  try {
    const logPath = path.join(REVIEW_LOG_DIR, `${changeId}.json`);
    
    const logData = {
      changeId,
      approved: reviewStatus.approved === true,
      reviewId: reviewStatus.reviewId,
      timestamp: reviewStatus.timestamp || new Date().toISOString(),
      reviewer: reviewStatus.reviewer || 'Reviewer Agent',
      notionPageId: reviewStatus.notionPageId
    };
    
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    console.log(`✅ Saved review log to ${logPath}`);
    
    return true;
  } catch (error) {
    console.error(`Error saving review log: ${error.message}`);
    return false;
  }
}

/**
 * Check Notion for review status
 * @param {string} changeDescription - Description of the change
 * @returns {Promise<Object>} - Notion review status
 */
async function checkNotionReviewStatus(changeDescription) {
  try {
    if (!notion) {
      return {
        found: false,
        message: 'Notion client not available'
      };
    }
    
    if (!process.env.SECONDBRAIN_TASKS_DATABASE_ID) {
      return {
        found: false,
        message: 'SecondBrain Tasks database ID not found in environment'
      };
    }
    
    // Search for review records in SecondBrain Tasks
    const response = await notion.databases.query({
      database_id: process.env.SECONDBRAIN_TASKS_DATABASE_ID,
      filter: {
        and: [
          {
            property: 'Name',
            rich_text: {
              contains: 'Review:'
            }
          },
          {
            property: 'Name',
            rich_text: {
              contains: changeDescription.substring(0, 30) // Use first 30 chars
            }
          },
          {
            property: 'Status',
            status: {
              equals: 'Completed'
            }
          },
          {
            property: 'Assigned Agent',
            select: {
              equals: 'Reviewer'
            }
          }
        ]
      },
      sorts: [
        {
          property: 'Last Synced',
          direction: 'descending'
        }
      ]
    });
    
    // Check if any approved reviews found
    if (response.results.length > 0) {
      const latestReview = response.results[0];
      const reviewTitle = latestReview.properties.Name.title[0]?.plain_text || '';
      
      // Check if review is approved
      if (reviewTitle.includes('APPROVED')) {
        return {
          found: true,
          approved: true,
          reviewId: latestReview.properties['Task ID']?.rich_text[0]?.plain_text || `NOTION-${latestReview.id}`,
          timestamp: latestReview.properties['Last Synced']?.date?.start || new Date().toISOString(),
          reviewer: 'Reviewer Agent',
          notionPageId: latestReview.id
        };
      } else {
        return {
          found: true,
          approved: false,
          message: 'Review found but not approved',
          reviewId: latestReview.properties['Task ID']?.rich_text[0]?.plain_text || `NOTION-${latestReview.id}`,
          notionPageId: latestReview.id
        };
      }
    }
    
    return {
      found: false,
      message: 'No matching review records found in Notion'
    };
  } catch (error) {
    console.error('Error checking Notion review status:', error);
    return {
      found: false,
      error: error.toString()
    };
  }
}

/**
 * Create a review record in Notion
 * @param {string} changeDescription - Description of the change
 * @param {string} reviewerFeedback - Feedback from the reviewer
 * @param {boolean} approved - Whether the change is approved
 * @returns {Promise<Object>} - Result of review creation
 */
async function createReviewRecord(changeDescription, reviewerFeedback, approved = false) {
  try {
    if (!notion) {
      throw new Error('Notion client not available');
    }
    
    if (!process.env.SECONDBRAIN_TASKS_DATABASE_ID) {
      throw new Error('SecondBrain Tasks database ID not found in environment');
    }
    
    // Generate unique review ID
    const reviewId = `REV-${new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 12)}`;
    
    // Create review record in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.SECONDBRAIN_TASKS_DATABASE_ID
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: `Review: ${approved ? 'APPROVED' : 'PENDING'} - ${changeDescription}`
              }
            }
          ]
        },
        Status: {
          status: {
            name: approved ? "Completed" : "In Progress"
          }
        },
        Priority: {
          select: {
            name: "P2"
          }
        },
        "Task ID": {
          rich_text: [
            {
              text: {
                content: reviewId
              }
            }
          ]
        },
        "Assigned Agent": {
          select: {
            name: "Reviewer"
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
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Reviewer Assessment"
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
                  content: reviewerFeedback
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
                  content: "Review Status"
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
                  content: approved ? "✅ APPROVED" : "⏳ PENDING APPROVAL"
                }
              }
            ]
          }
        }
      ]
    });
    
    // Save local record
    const changeId = `${changeDescription.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
    saveLocalReviewLog(changeId, {
      approved,
      reviewId,
      timestamp: new Date().toISOString(),
      reviewer: 'Reviewer Agent',
      notionPageId: response.id
    });
    
    return {
      success: true,
      reviewId,
      notionPageId: response.id
    };
  } catch (error) {
    console.error('Error creating review record:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

module.exports = {
  verifyReviewerApproval,
  createReviewRecord,
  checkNotionReviewStatus
};