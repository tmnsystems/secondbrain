/**
 * Import Master Plan to Notion
 * Creates a structured project plan in Notion based on the master plan
 */

import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Master plan data structured for Notion import
const masterPlan = {
  name: "SecondBrain Business Strategy Master Plan",
  description: "Comprehensive strategy and execution plan for Tina Marie's SecondBrain ecosystem of AI-powered business tools.",
  
  identity: {
    name: "Tina Marie",
    role: "Founder, Strategist, Business Architect",
    experience: "30 years scaling startups to 7–8 figures",
    mission: "Use AI + SaaS to liberate serious entrepreneurs from complexity, staff dependency, and marketing hype."
  },
  
  coreValues: [
    "Freedom, peace, clarity, confidence, and swift, iterative execution matter more than hype or vanity",
    "Systems thinking over trends",
    "Self-ownership over dependency",
    "Truthful marketing over manipulation",
    "Respect for the customer's time, intelligence, and wallet",
    "Always build from foundation outward — no skipping steps",
    "Speed of information processing is survival-critical — delays cost businesses dearly"
  ],
  
  philosophy: "We build for capable, serious entrepreneurs — not marketers. Execution, clarity, and confidence matter more than appearances or hype.",
  
  primeDirective: {
    rules: [
      "Build broad, solid foundations before scaling",
      "Launch minimum viable products fast, iterate based on real feedback",
      "If a tool or system can be replaced with a more efficient option we already own, without significant degradation in quality, prefer reuse",
      "Every tool must be simple enough that a 10-year-old could use it (no hype layers)",
      "AI replaces or minimizes manual staffing where practical",
      "Productize everything: if we need it, others likely do too",
      "Stay modular, flexible, self-owned — no unnecessary lock-in",
      "Prompt chaining is a mandatory technique — always deepen results by sequential refinement, not isolated prompts",
      "Use Claude and Multi-agent approaches (Claude CLI with tool access) wherever possible to maximize automation and intelligence"
    ]
  },
  
  financialGoals: [
    "Primary Goal: $50,000/month in recurring revenue, no 1:1 client meetings or schedule-dependent income",
    "Secondary Goal: Multiple low-maintenance SaaS and AI tools generating $15,000–$20,000/month cash flow via upsells, cross-sells, and evergreen ads",
    "Supporting Goal: Launch small cash-generating niche tools and verticals while SecondBrain and major SaaS projects mature"
  ],
  
  productStack: [
    {
      name: "CoachTinaMarieAI",
      description: "AI-powered strategic coach built from Tina's frameworks and teaching style",
      pricing: "$97/mo or $997/yr subscription, 7-day free trial",
      features: [
        "Chat-based coaching",
        "Course outline and lesson drafting",
        "SOP generation",
        "Contextual retrieval (RAG system) from Pinecone knowledgebase",
        "Strict voice-tone and thought structure replication"
      ],
      status: "MVP embedding real corpus next"
    },
    {
      name: "TubeToTask",
      description: "Scheduled YouTube scraping to extract actionable content",
      pricing: "$49 lifetime or $69/year, 7-day free trial",
      features: [
        "Scheduled playlist/channel scraping",
        "Actionable summarization",
        "Content-to-goal mapping",
        "Repurpose ideas + alerts"
      ],
      status: "Dev-mode, prepping cash launch"
    },
    {
      name: "NymirAI",
      description: "Self-hosted multi-model AI chat wrapper",
      pricing: "$49 lifetime or $69/year, 7-day free trial",
      features: [
        "Model routing (o3, 4o, 4.1 variants)",
        "API key control",
        "Prompt customization",
        "Mobile/desktop UI"
      ],
      status: "Stable MVP"
    },
    {
      name: "ClientManager",
      description: "Lightweight CRM (Notion MVP)",
      pricing: "$97 one-time, 1-month free CoachTinaMarieAI trial",
      features: [
        "Lead capture to alumni lifecycle mapping",
        "Portal templates",
        "Visual KPI tracking",
        "AI-assist for SOP onboarding (planned)"
      ],
      status: "Notion MVP mid-build"
    },
    {
      name: "Incredagents",
      description: "Modular micro-agents for executing business functions",
      pricing: "Subscription inside CoachTinaMarieAI/MCP ecosystem",
      features: [
        "Role-based microSaaS execution agents",
        "Plug-and-play install design"
      ],
      status: "Planned post-ClientManager SaaS"
    }
  ],
  
  businessModel: [
    "7-day free trials, clear auto-cancel",
    "Annual subscriptions encouraged to retain update access",
    "Lifetime access only for tools with minimal backend overhead (TubeToTask, NymirAI)",
    "Cross-sell/upsell strategy deeply embedded (e.g. TubeToTask → CoachTinaMarieAI)",
    "AI chatbot support by default, human concierge added with scale"
  ],
  
  stackAndHosting: [
    "Dev: Local (tinamarie@Mac dev %), synced with GitHub",
    "Replit for quick launches, Vercel/Railway for SaaS-grade scaling",
    "Codex used early, now transitioning fully to Claude Code for programmable agentic coding"
  ],
  
  toolReductionPolicy: [
    "Use Notion where possible; defer to Airtable for API-heavy use cases",
    "Airtable preferred for scrapers, data automation, and performance"
  ],
  
  mcpScrapers: {
    purpose: "Pull public data into AI workflows for product ideas, outreach, intel",
    tools: [
      "Reddit Opportunity Scraper (top priority)",
      "Google Maps Leads Scraper",
      "YouTube Comments Scraper",
      "Review Aggregator",
      "Competitor Pricing Tracker"
    ],
    execution: "Codex + Puppeteer; fallback to Claude; Airtable preferred"
  },
  
  frameworkStack: [
    "LangGraph for agent orchestration",
    "Pydantic for data validation + structured context",
    "Archon for connecting LangGraph, Codex CLI, RAG, and automation layers",
    "Claude Code with Claude CLI for advanced tool access"
  ],
  
  agentArchitecture: {
    components: [
      "Planner Agent: Project planning and task breakdown",
      "Executor Agent: Handles system operations and deployment",
      "Notion Agent: Documentation and knowledge management",
      "Build Agent: Code generation and scaffolding",
      "Reviewer Agent: Code quality assurance",
      "Refactor Agent: Code optimization and maintenance",
      "Orchestrator Agent: Coordinates other agents"
    ],
    order: [
      "1. Planner Agent: First to be developed as it organizes all subsequent work",
      "2. Executor Agent: Required for environment setup and basic operations",
      "3. Notion Agent: Essential for documentation and coordination",
      "4. Build Agent: Foundation for creating new components and projects",
      "5. Reviewer Agent: Ensures quality before deployment",
      "6. Refactor Agent: Optimizes existing code for maintenance",
      "7. Orchestrator Agent: Coordinates all other agents for complex workflows"
    ]
  },
  
  membershipPlatform: [
    "Plan: Stripe + lightweight portal (Next.js + Supabase) or Ghost (if content-heavy)",
    "Avoid GoHighLevel unless unavoidable"
  ],
  
  statusSnapshot: [
    "CoachTinaMarieAI: Embedding corpus",
    "TubeToTask: Cash-launch prep",
    "NymirAI: Stable, polishing",
    "ClientManager: Mid Notion MVP",
    "Incredagents: Queued post-CRM",
    "MCP Scrapers: Reddit agent next in build order",
    "MCP Agents: Planner Agent development complete"
  ]
};

/**
 * Main function to import the master plan into Notion
 */
async function importMasterPlan() {
  console.log('🔄 Importing Master Plan to Notion...');

  // Get Notion API key from environment
  const notionApiKey = process.env.NOTION_API_KEY;
  const projectDbId = process.env.NOTION_PROJECT_DB_ID;
  
  if (!notionApiKey) {
    console.error('❌ Error: NOTION_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!projectDbId) {
    console.error('❌ Error: NOTION_PROJECT_DB_ID environment variable is not set');
    process.exit(1);
  }
  
  // Initialize Notion client
  const notion = new Client({ auth: notionApiKey });
  
  try {
    // Create the master plan page
    console.log('📝 Creating Master Plan page in Notion...');
    
    const response = await notion.pages.create({
      parent: {
        database_id: projectDbId
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: masterPlan.name
              }
            }
          ]
        },
        Status: {
          select: {
            name: 'Planning'
          }
        },
        Priority: {
          select: {
            name: 'High'
          }
        },
        'Start Date': {
          date: {
            start: new Date().toISOString().split('T')[0]
          }
        },
        Description: {
          rich_text: [
            {
              text: {
                content: masterPlan.description.substring(0, 2000)
              }
            }
          ]
        }
      },
      children: []
    });
    
    const projectId = response.id;
    console.log(`✅ Created Master Plan page with ID: ${projectId}`);
    
    // Add Identity section
    const identityBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Identity'
              }
            }
          ]
        }
      },
      {
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Name: ${masterPlan.identity.name}`
              }
            }
          ]
        }
      },
      {
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Role: ${masterPlan.identity.role}`
              }
            }
          ]
        }
      },
      {
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Experience: ${masterPlan.identity.experience}`
              }
            }
          ]
        }
      },
      {
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Mission: ${masterPlan.identity.mission}`
              }
            }
          ]
        }
      },
      {
        object: 'block',
        heading_2: {
          rich_text: [
            {
              text: {
                content: 'Core Values'
              }
            }
          ]
        }
      }
    ];

    // Add Core Values
    for (const value of masterPlan.coreValues) {
      identityBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: value
              }
            }
          ]
        }
      });
    }

    // Add Philosophy
    identityBlocks.push({
      object: 'block',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Philosophy'
            }
          }
        ]
      }
    });

    identityBlocks.push({
      object: 'block',
      paragraph: {
        rich_text: [
          {
            text: {
              content: masterPlan.philosophy
            }
          }
        ]
      }
    });

    // Add Identity section
    await notion.blocks.children.append({
      block_id: projectId,
      children: identityBlocks
    });
    console.log('✅ Added Identity section');

    // Add Prime Directive
    const directiveBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Prime Directive'
              }
            }
          ]
        }
      },
      {
        object: 'block',
        heading_2: {
          rich_text: [
            {
              text: {
                content: 'Rules'
              }
            }
          ]
        }
      }
    ];

    // Add Rules
    for (const rule of masterPlan.primeDirective.rules) {
      directiveBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: rule
              }
            }
          ]
        }
      });
    }

    // Add Prime Directive section
    await notion.blocks.children.append({
      block_id: projectId,
      children: directiveBlocks
    });
    console.log('✅ Added Prime Directive section');

    // Add Financial Goals
    const financialBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Financial Goals'
              }
            }
          ]
        }
      }
    ];

    // Add Goals
    for (const goal of masterPlan.financialGoals) {
      financialBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: goal
              }
            }
          ]
        }
      });
    }

    // Add Financial Goals section
    await notion.blocks.children.append({
      block_id: projectId,
      children: financialBlocks
    });
    console.log('✅ Added Financial Goals section');

    // Add Product Stack
    const productBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Product Stack'
              }
            }
          ]
        }
      }
    ];

    // Add Products
    for (const product of masterPlan.productStack) {
      productBlocks.push({
        object: 'block',
        heading_2: {
          rich_text: [
            {
              text: {
                content: product.name
              }
            }
          ]
        }
      });

      productBlocks.push({
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: product.description
              }
            }
          ]
        }
      });

      productBlocks.push({
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Pricing: ${product.pricing}`
              }
            }
          ]
        }
      });

      productBlocks.push({
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Status: ${product.status}`
              }
            }
          ]
        }
      });

      productBlocks.push({
        object: 'block',
        heading_3: {
          rich_text: [
            {
              text: {
                content: 'Features'
              }
            }
          ]
        }
      });

      for (const feature of product.features) {
        productBlocks.push({
          object: 'block',
          bulleted_list_item: {
            rich_text: [
              {
                text: {
                  content: feature
                }
              }
            ]
          }
        });
      }
    }

    // Add Product Stack section
    await notion.blocks.children.append({
      block_id: projectId,
      children: productBlocks
    });
    console.log('✅ Added Product Stack section');

    // Add Business Model
    const businessBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Business Model'
              }
            }
          ]
        }
      }
    ];

    // Add Business Model points
    for (const point of masterPlan.businessModel) {
      businessBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: point
              }
            }
          ]
        }
      });
    }

    // Add Business Model section
    await notion.blocks.children.append({
      block_id: projectId,
      children: businessBlocks
    });
    console.log('✅ Added Business Model section');

    // Add Stack & Hosting
    const stackBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Stack & Hosting'
              }
            }
          ]
        }
      }
    ];

    // Add Stack & Hosting points
    for (const point of masterPlan.stackAndHosting) {
      stackBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: point
              }
            }
          ]
        }
      });
    }

    // Add Stack & Hosting section
    await notion.blocks.children.append({
      block_id: projectId,
      children: stackBlocks
    });
    console.log('✅ Added Stack & Hosting section');

    // Add Tool Reduction Policy
    const toolBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Tool Reduction Policy'
              }
            }
          ]
        }
      }
    ];

    // Add Tool Reduction Policy points
    for (const point of masterPlan.toolReductionPolicy) {
      toolBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: point
              }
            }
          ]
        }
      });
    }

    // Add Tool Reduction Policy section
    await notion.blocks.children.append({
      block_id: projectId,
      children: toolBlocks
    });
    console.log('✅ Added Tool Reduction Policy section');

    // Add MCP Scrapers
    const scraperBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'MCP Scrapers'
              }
            }
          ]
        }
      },
      {
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: `Purpose: ${masterPlan.mcpScrapers.purpose}`
              }
            }
          ]
        }
      },
      {
        object: 'block',
        heading_2: {
          rich_text: [
            {
              text: {
                content: 'Tools'
              }
            }
          ]
        }
      }
    ];

    // Add MCP Scrapers tools
    for (const tool of masterPlan.mcpScrapers.tools) {
      scraperBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: tool
              }
            }
          ]
        }
      });
    }

    scraperBlocks.push({
      object: 'block',
      paragraph: {
        rich_text: [
          {
            text: {
              content: `Execution: ${masterPlan.mcpScrapers.execution}`
            }
          }
        ]
      }
    });

    // Add MCP Scrapers section
    await notion.blocks.children.append({
      block_id: projectId,
      children: scraperBlocks
    });
    console.log('✅ Added MCP Scrapers section');

    // Add Framework Stack
    const frameworkBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Framework Stack'
              }
            }
          ]
        }
      }
    ];

    // Add Framework Stack points
    for (const point of masterPlan.frameworkStack) {
      frameworkBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: point
              }
            }
          ]
        }
      });
    }

    // Add Framework Stack section
    await notion.blocks.children.append({
      block_id: projectId,
      children: frameworkBlocks
    });
    console.log('✅ Added Framework Stack section');

    // Add Agent Architecture
    const agentBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Agent Architecture'
              }
            }
          ]
        }
      },
      {
        object: 'block',
        heading_2: {
          rich_text: [
            {
              text: {
                content: 'Components'
              }
            }
          ]
        }
      }
    ];

    // Add Agent Architecture components
    for (const component of masterPlan.agentArchitecture.components) {
      agentBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: component
              }
            }
          ]
        }
      });
    }

    agentBlocks.push({
      object: 'block',
      heading_2: {
        rich_text: [
          {
            text: {
              content: 'Development Order'
            }
          }
        ]
      }
    });

    // Add Agent Architecture development order
    for (const order of masterPlan.agentArchitecture.order) {
      agentBlocks.push({
        object: 'block',
        paragraph: {
          rich_text: [
            {
              text: {
                content: order
              }
            }
          ]
        }
      });
    }

    // Add Agent Architecture section
    await notion.blocks.children.append({
      block_id: projectId,
      children: agentBlocks
    });
    console.log('✅ Added Agent Architecture section');

    // Add Membership Platform
    const membershipBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Membership Platform'
              }
            }
          ]
        }
      }
    ];

    // Add Membership Platform points
    for (const point of masterPlan.membershipPlatform) {
      membershipBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: point
              }
            }
          ]
        }
      });
    }

    // Add Membership Platform section
    await notion.blocks.children.append({
      block_id: projectId,
      children: membershipBlocks
    });
    console.log('✅ Added Membership Platform section');

    // Add Status Snapshot
    const statusBlocks = [
      {
        object: 'block',
        heading_1: {
          rich_text: [
            {
              text: {
                content: 'Status Snapshot'
              }
            }
          ]
        }
      }
    ];

    // Add Status Snapshot points
    for (const point of masterPlan.statusSnapshot) {
      statusBlocks.push({
        object: 'block',
        bulleted_list_item: {
          rich_text: [
            {
              text: {
                content: point
              }
            }
          ]
        }
      });
    }

    // Add Status Snapshot section
    await notion.blocks.children.append({
      block_id: projectId,
      children: statusBlocks
    });
    console.log('✅ Added Status Snapshot section');

    // Create task for each product in the Product Stack
    const taskDbId = process.env.NOTION_TASK_DB_ID;
    if (taskDbId) {
      console.log('📝 Creating tasks for each product...');
      
      for (const product of masterPlan.productStack) {
        await notion.pages.create({
          parent: {
            database_id: taskDbId
          },
          properties: {
            Name: {
              title: [
                {
                  text: {
                    content: `Develop ${product.name}`
                  }
                }
              ]
            },
            Status: {
              select: {
                name: product.status.includes('MVP') ? 'In Progress' : 'Not Started'
              }
            },
            Priority: {
              select: {
                name: product.name === 'CoachTinaMarieAI' ? 'High' : 'Medium'
              }
            },
            Project: {
              relation: [
                {
                  id: projectId
                }
              ]
            },
            Effort: {
              number: 8
            },
            Description: {
              rich_text: [
                {
                  text: {
                    content: `Develop and launch ${product.name}: ${product.description}. Current status: ${product.status}`
                  }
                }
              ]
            }
          },
          children: [
            {
              object: 'block',
              heading_2: {
                rich_text: [
                  {
                    text: {
                      content: 'Features'
                    }
                  }
                ]
              }
            },
            ...product.features.map(feature => ({
              object: 'block',
              bulleted_list_item: {
                rich_text: [
                  {
                    text: {
                      content: feature
                    }
                  }
                ]
              }
            })),
            {
              object: 'block',
              heading_2: {
                rich_text: [
                  {
                    text: {
                      content: 'Pricing'
                    }
                  }
                ]
              }
            },
            {
              object: 'block',
              paragraph: {
                rich_text: [
                  {
                    text: {
                      content: product.pricing
                    }
                  }
                ]
              }
            }
          ]
        });
        
        console.log(`✅ Created task for ${product.name}`);
      }
    }

    // Create task for each agent in the Agent Architecture
    if (taskDbId) {
      console.log('📝 Creating tasks for each agent...');
      
      for (const component of masterPlan.agentArchitecture.components) {
        const agentName = component.split(':')[0].trim();
        const agentDescription = component.split(':')[1].trim();
        
        await notion.pages.create({
          parent: {
            database_id: taskDbId
          },
          properties: {
            Name: {
              title: [
                {
                  text: {
                    content: `Develop ${agentName}`
                  }
                }
              ]
            },
            Status: {
              select: {
                name: agentName === 'Planner Agent' ? 'Completed' : 'Not Started'
              }
            },
            Priority: {
              select: {
                name: agentName === 'Planner Agent' || agentName === 'Executor Agent' ? 'High' : 'Medium'
              }
            },
            Project: {
              relation: [
                {
                  id: projectId
                }
              ]
            },
            Effort: {
              number: 5
            },
            Description: {
              rich_text: [
                {
                  text: {
                    content: `Develop and implement the ${agentName}: ${agentDescription}`
                  }
                }
              ]
            }
          }
        });
        
        console.log(`✅ Created task for ${agentName}`);
      }
    }

    // Print Notion URL
    console.log(`\n🔗 Master Plan URL: https://notion.so/${projectId.replace(/-/g, '')}`);
    
    console.log('\n🎉 Master Plan import complete!');
  } catch (error) {
    console.error('❌ Error importing master plan to Notion:', error);
  }
}

// Run the import
importMasterPlan().catch(console.error);