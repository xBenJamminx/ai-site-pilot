# AI Instructions for ai-site-pilot

This file provides instructions for AI coding assistants (Claude, GPT, Copilot, etc.) on how to integrate ai-site-pilot into projects.

## What is ai-site-pilot?

A drop-in AI chat widget that can **control and navigate websites**. It's not just a chatbot - the AI can execute tools to filter content, open modals, navigate sections, and more.

## ⚠️ IMPORTANT: How the AI Learns Your Site

The package provides chat UI and streaming. **The AI doesn't automatically know your site structure.** You must:

1. **Tell it what exists** - In the system prompt, list your sections, data, categories
2. **Define tools** - Create tools that match your site's DOM and state
3. **Write handlers** - Client-side code that executes the actual actions

### Example: Teaching the AI About Your Site

```typescript
// In your API route - this is the MOST IMPORTANT part
const SYSTEM_PROMPT = `You are an AI assistant for MyStore.

## SITE STRUCTURE
The page has these sections (use navigate_to_section tool):
- hero: Top of page with tagline
- products: Product grid (id="products")
- about: About us section (id="about")
- contact: Contact form (id="contact")

## AVAILABLE DATA
Products on this site:
- Electronics: laptops, phones, tablets
- Clothing: shirts, pants, shoes
- Home: furniture, decor, kitchen

Categories for filtering: electronics, clothing, home, all

## YOUR TOOLS
- navigate_to_section: Scroll to a section by ID
- filter_products: Filter the product grid by category
- open_product_modal: Show details for a specific product (use product slug)
- open_contact: Open the contact modal

## BEHAVIOR
- When users ask about products, use filter_products to show relevant category
- When users want details, use open_product_modal
- When users want to buy/contact, use open_contact
- Always be helpful and proactively use tools to show relevant content`;
```

The system prompt teaches the AI:
- What sections exist and their IDs
- What data/content is available
- What tools it can use and when
- How to behave (proactively use tools)

## Quick Setup (Copy-Paste Ready)

### 1. Install the package

```bash
npm install ai-site-pilot
```

### 2. Create the API route

Create `app/api/chat/route.ts` (Next.js App Router):

```typescript
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
// Or use any Vercel AI SDK provider:
// import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';

const SYSTEM_PROMPT = `You are a helpful AI assistant for this website. You can help users navigate and find information.

## YOUR CAPABILITIES
You have access to tools that control the website:
- navigate_to_section: Scroll to different sections
- open_modal: Open detail modals
- filter_content: Filter displayed content
- search: Search the site

Use these tools proactively when relevant to the user's request.`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      // Define your site-specific tools here
      navigate_to_section: {
        description: 'Scroll to a section of the page',
        parameters: {
          type: 'object',
          properties: {
            section: { type: 'string', enum: ['hero', 'features', 'pricing', 'contact'] }
          },
          required: ['section']
        }
      },
      // Add more tools as needed
    },
  });

  return result.toDataStreamResponse();
}
```

### 3. Add the chat widget

In your layout or page component:

```tsx
'use client';

import { SitePilot } from 'ai-site-pilot';
import 'ai-site-pilot/styles.css';

export function ChatWidget() {
  const handleToolCall = (name: string, args: Record<string, unknown>) => {
    // Handle tool execution - this runs on the client
    switch (name) {
      case 'navigate_to_section':
        document.getElementById(args.section as string)?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'open_modal':
        // Your modal logic
        break;
      // Handle other tools
    }
  };

  return (
    <SitePilot
      apiEndpoint="/api/chat"
      onToolCall={handleToolCall}
      suggestions={[
        { text: 'Show me features', icon: '✨' },
        { text: 'How does pricing work?', icon: '💰' },
        { text: 'Contact sales', icon: '📞' },
      ]}
      welcomeMessage="Hi! I can help you explore this site. What would you like to know?"
      theme={{
        accentColor: '#3b82f6',      // Your brand color
        backgroundColor: '#0f172a',   // Dark background
        // See full theme options below
      }}
    />
  );
}
```

## Theme Customization

All colors accept any CSS color value (hex, rgb, hsl, etc.):

```tsx
<SitePilot
  theme={{
    // Position
    position: 'bottom-right',  // 'bottom-left', 'top-right', 'top-left'
    borderRadius: 24,          // pixels

    // Colors
    accentColor: '#f59e0b',           // Primary accent (buttons, highlights)
    accentColorDark: '#d97706',       // Gradient end color
    backgroundColor: '#0F0720',        // Panel background
    textColor: '#ffffff',              // Primary text
    textMutedColor: '#a1a1aa',        // Secondary text
    borderColor: 'rgba(255,255,255,0.1)',

    // Message bubbles
    userMessageBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
    assistantMessageBg: 'rgba(255,255,255,0.05)',
  }}
/>
```

## Feature Toggles

```tsx
<SitePilot
  features={{
    speech: true,       // Voice input (microphone)
    tts: true,          // Text-to-speech for responses
    fullscreen: true,   // Fullscreen toggle button
    suggestions: true,  // Show suggestion chips
  }}
/>
```

## Tool System

Define tools that the AI can call to control your site:

```typescript
// Using the defineTool helper (optional, for type safety)
import { defineTool } from 'ai-site-pilot/tools';

const filterProductsTool = defineTool({
  name: 'filter_products',
  description: 'Filter products by category',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Product category',
        enum: ['electronics', 'clothing', 'home', 'all']
      }
    },
    required: ['category']
  }
});
```

## Environment Variables

For the API route, you'll need your AI provider's API key:

```env
# For Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here

# Or for OpenAI
OPENAI_API_KEY=your-key-here

# Or for Anthropic
ANTHROPIC_API_KEY=your-key-here
```

## Complete Real-World Example

Here's a full implementation for a portfolio site showing all three parts:

### Part 1: System Prompt (teaches the AI what exists)

```typescript
// app/api/chat/route.ts
const PROJECTS = `
Available projects (use open_project_modal with these IDs):
- acme-dashboard: Acme Dashboard (SaaS, Live) - Analytics platform
- mobile-app: FitTrack (Mobile, Live) - Fitness tracking app
- ecommerce: ShopFlow (E-commerce, In Progress) - Online store template
- api-service: DataSync API (Backend, Live) - Data synchronization service

Categories: All, SaaS, Mobile, E-commerce, Backend
Statuses: Live, In Progress, Concept
`;

const SYSTEM_PROMPT = `You are a portfolio assistant for Jane Developer.

## SITE SECTIONS
- hero: Landing section with intro (id="hero")
- projects: Project showcase grid (id="projects")
- about: About section (id="about")
- contact: Contact form (id="contact")

## PROJECT DATA
${PROJECTS}

## YOUR TOOLS
- navigate_to_section: Scroll to hero, projects, about, or contact
- filter_by_category: Filter projects (SaaS, Mobile, E-commerce, Backend, All)
- filter_by_status: Filter by status (Live, In Progress, Concept)
- open_project_modal: Open project details (use project ID like "acme-dashboard")
- highlight_project: Pulse animation on a project card
- open_contact: Open contact/hire modal

## WHEN TO USE TOOLS
- "Show me your work" → navigate_to_section("projects")
- "Any mobile apps?" → filter_by_category("Mobile")
- "What's live?" → filter_by_status("Live")
- "Tell me about Acme" → open_project_modal("acme-dashboard")
- "I want to hire you" → open_contact()

Be conversational but proactively use tools to make the site interactive.`;
```

### Part 2: Tool Definitions (what the AI can call)

```typescript
// app/api/chat/route.ts (continued)
export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      navigate_to_section: {
        description: 'Scroll to a page section',
        parameters: {
          type: 'object',
          properties: {
            section: { type: 'string', enum: ['hero', 'projects', 'about', 'contact'] }
          },
          required: ['section']
        }
      },
      filter_by_category: {
        description: 'Filter projects by category',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['All', 'SaaS', 'Mobile', 'E-commerce', 'Backend'] }
          },
          required: ['category']
        }
      },
      open_project_modal: {
        description: 'Open project detail modal',
        parameters: {
          type: 'object',
          properties: {
            projectId: { type: 'string', description: 'Project ID like acme-dashboard' }
          },
          required: ['projectId']
        }
      },
      open_contact: {
        description: 'Open the contact/hire modal',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    },
  });

  return result.toDataStreamResponse();
}
```

### Part 3: Client Handler (executes the actions)

```tsx
// components/ChatWidget.tsx
'use client';

import { SitePilot } from 'ai-site-pilot';
import 'ai-site-pilot/styles.css';

export function ChatWidget() {
  const handleToolCall = (name: string, args: Record<string, unknown>) => {
    switch (name) {
      case 'navigate_to_section':
        document.getElementById(args.section as string)?.scrollIntoView({
          behavior: 'smooth'
        });
        break;

      case 'filter_by_category':
        // Dispatch custom event for your page to handle
        window.dispatchEvent(new CustomEvent('filter-projects', {
          detail: { category: args.category }
        }));
        break;

      case 'open_project_modal':
        window.dispatchEvent(new CustomEvent('open-project', {
          detail: { projectId: args.projectId }
        }));
        break;

      case 'open_contact':
        window.dispatchEvent(new CustomEvent('open-contact'));
        break;
    }
  };

  return (
    <SitePilot
      apiEndpoint="/api/chat"
      onToolCall={handleToolCall}
      suggestions={[
        { text: "Show me your work", icon: "💼" },
        { text: "What's live?", icon: "🚀" },
        { text: "I want to hire you", icon: "💡" },
      ]}
      theme={{
        accentColor: '#8b5cf6',
        backgroundColor: '#0f0f23',
      }}
    />
  );
}
```

### Part 4: Page Listens for Events

```tsx
// app/page.tsx or components/HomePage.tsx
'use client';

import { useEffect, useState } from 'react';

export function HomePage() {
  const [filter, setFilter] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const handleFilter = (e: CustomEvent) => setFilter(e.detail.category);
    const handleProject = (e: CustomEvent) => setSelectedProject(e.detail.projectId);
    const handleContact = () => setShowContact(true);

    window.addEventListener('filter-projects', handleFilter as EventListener);
    window.addEventListener('open-project', handleProject as EventListener);
    window.addEventListener('open-contact', handleContact);

    return () => {
      window.removeEventListener('filter-projects', handleFilter as EventListener);
      window.removeEventListener('open-project', handleProject as EventListener);
      window.removeEventListener('open-contact', handleContact);
    };
  }, []);

  // Your page components use filter, selectedProject, showContact state...
}
```

## Common Patterns

### E-commerce Site
```tsx
const tools = {
  search_products: { /* search inventory */ },
  filter_by_category: { /* filter product grid */ },
  add_to_cart: { /* add item to cart */ },
  open_product: { /* show product details */ },
};
```

### Documentation Site
```tsx
const tools = {
  search_docs: { /* search documentation */ },
  navigate_to_page: { /* go to specific doc page */ },
  show_code_example: { /* display code snippet */ },
};
```

### Portfolio Site
```tsx
const tools = {
  filter_projects: { /* filter by category/status */ },
  open_project_modal: { /* show project details */ },
  navigate_to_section: { /* scroll to section */ },
  open_contact: { /* open contact form */ },
};
```

## Troubleshooting

**Chat not appearing?**
- Make sure you imported the CSS: `import 'ai-site-pilot/styles.css'`
- Check that the component is rendered (use React DevTools)

**Tools not executing?**
- Verify `onToolCall` is passed to SitePilot
- Check browser console for the tool calls
- Make sure tool names match between API and client

**Styling issues?**
- CSS variables can be overridden in your global CSS
- The component uses `z-index: 200` - adjust if needed

## Full Props Reference

```typescript
interface SitePilotProps {
  apiEndpoint: string;              // Required: Your chat API endpoint
  theme?: SitePilotTheme;           // Theme customization
  suggestions?: Suggestion[];        // Suggestion chips
  features?: SitePilotFeatures;      // Feature toggles
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  defaultOpen?: boolean;             // Start with chat open
  placeholder?: string;              // Input placeholder
  welcomeMessage?: string;           // Initial greeting
  className?: string;                // Additional CSS class
}
```
