# AI Instructions for ai-site-pilot

This file helps AI coding assistants (Claude, GPT, Copilot) integrate ai-site-pilot into projects.

## What is ai-site-pilot?

A drop-in AI chat widget that can **control and navigate websites**. The AI can execute tools to filter content, open modals, navigate sections, and more.

**Key features:**
- Works with any AI model via OpenRouter (Gemini, GPT-4, Claude, Llama)
- Free tier available (Gemini 2.0 Flash)
- Auto-generates system prompts from site content
- Streaming responses with tool execution

## Quick Setup (Recommended)

### 1. Install

```bash
npm install ai-site-pilot
```

### 2. Configure Tailwind (Required)

Add to `tailwind.config.js`:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './node_modules/ai-site-pilot/dist/**/*.{js,mjs}',  // Required!
  ],
}
```

### 3. Create API Route with `siteContent`

The easiest way - just pass your site's data and the prompt is auto-generated:

```typescript
// app/api/chat/route.ts
import { createHandler } from 'ai-site-pilot/api';
import { defineTool } from 'ai-site-pilot/tools';

// Define tools the AI can use
const navigateTool = defineTool({
  name: 'navigate_to_section',
  description: 'Scroll to a section of the page',
  parameters: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        description: 'Section ID to navigate to',
        enum: ['hero', 'services', 'about', 'contact'],
      },
    },
    required: ['section'],
  },
});

const showServiceTool = defineTool({
  name: 'show_service',
  description: 'Show details about a specific service',
  parameters: {
    type: 'object',
    properties: {
      serviceId: {
        type: 'string',
        description: 'The service ID',
      },
    },
    required: ['serviceId'],
  },
});

// Create handler with site content - prompt is auto-generated!
export const POST = createHandler({
  model: 'google/gemini-2.0-flash-exp:free',  // Free!
  siteContent: {
    name: 'Acme Dance Studio',
    type: 'dance studio',
    description: 'Premier dance education for all ages',
    personality: 'warm, encouraging, and helpful',
    pages: ['home', 'classes', 'teachers', 'schedule', 'contact'],
    items: [
      // Classes
      { id: 'ballet', name: 'Ballet', category: 'class', description: 'Classical ballet for ages 3-adult', price: '$80/month' },
      { id: 'jazz', name: 'Jazz', category: 'class', description: 'High-energy jazz for ages 6+', price: '$75/month' },
      { id: 'hip-hop', name: 'Hip Hop', category: 'class', description: 'Street dance styles for ages 8+', price: '$70/month' },
      // Teachers
      { id: 'sarah', name: 'Sarah Johnson', category: 'teacher', description: 'Owner, 15 years experience, specializes in ballet' },
      { id: 'mike', name: 'Mike Chen', category: 'teacher', description: 'Hip hop and jazz instructor, 8 years experience' },
    ],
    faqs: [
      { question: 'What should I wear?', answer: 'Leotard and ballet slippers for ballet, athletic wear for jazz and hip hop.' },
      { question: 'Do you offer trial classes?', answer: 'Yes! First class is free for new students.' },
    ],
    contact: {
      email: 'info@acmedance.com',
      phone: '555-123-4567',
      address: '123 Dance Street, NYC',
      hours: 'Mon-Sat 9am-8pm',
    },
  },
  tools: [navigateTool, showServiceTool],
});
```

**The AI now automatically knows:**
- All your classes, teachers, pricing
- FAQs and contact info
- What tools to use and when

### 4. Add the Chat Widget

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
          behavior: 'smooth',
        });
        break;
      case 'show_service':
        // Dispatch event for your page to handle
        window.dispatchEvent(new CustomEvent('show-service', {
          detail: { serviceId: args.serviceId },
        }));
        break;
    }
  };

  return (
    <SitePilot
      apiEndpoint="/api/chat"
      onToolCall={handleToolCall}
      suggestions={[
        { text: 'What classes do you offer?', icon: '💃' },
        { text: 'Meet the teachers', icon: '👩‍🏫' },
        { text: 'Contact us', icon: '📞' },
      ]}
      theme={{ accent: 'pink' }}  // or accentColor: '#ec4899'
      welcomeMessage="Hi! I'm your dance studio assistant. How can I help you today?"
    />
  );
}
```

### 5. Environment Variable

```bash
# .env.local
OPENROUTER_API_KEY=sk-or-...
```

Get a free key at [openrouter.ai](https://openrouter.ai) - Gemini 2.0 Flash is free!

## Alternative: Manual System Prompt

If you need full control, use `systemPrompt` instead of `siteContent`:

```typescript
export const POST = createHandler({
  model: 'google/gemini-2.0-flash-exp:free',
  systemPrompt: `You are an assistant for Acme Dance Studio.

## Classes
- Ballet: Ages 3-adult, $80/month
- Jazz: Ages 6+, $75/month
- Hip Hop: Ages 8+, $70/month

## Tools
- navigate_to_section: Scroll to a section (hero, classes, teachers, contact)
- show_service: Show details about a class

When users ask about classes, provide specific details.
Use tools proactively to show relevant content.`,
  tools: [navigateTool, showServiceTool],
});
```

## SiteContent Schema

```typescript
interface SiteContent {
  name: string;                    // Business name
  type?: string;                   // Business type (e.g., 'dance studio')
  description?: string;            // Brief description
  personality?: string;            // AI personality (e.g., 'warm and helpful')
  pages?: string[];                // Available navigation pages
  items?: SiteContentItem[];       // Products, services, team, etc.
  faqs?: Array<{ question: string; answer: string }>;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
  };
  additionalContext?: string;      // Extra info for the prompt
}

interface SiteContentItem {
  id: string;                      // Unique identifier
  name: string;                    // Display name
  category?: string;               // Category (e.g., 'class', 'teacher', 'product')
  description?: string;            // Description
  [key: string]: unknown;          // Any extra fields (price, duration, etc.)
}
```

## Theme Presets

Use preset names for easy theming:

```tsx
<SitePilot theme={{ accent: 'pink' }} />   // Hot pink
<SitePilot theme={{ accent: 'amber' }} />  // Default orange/amber
<SitePilot theme={{ accent: 'blue' }} />   // Primary blue
<SitePilot theme={{ accent: 'green' }} />  // Emerald green
<SitePilot theme={{ accent: 'purple' }} /> // Violet purple
<SitePilot theme={{ accent: 'cyan' }} />   // Teal cyan
```

Or use a custom hex color:

```tsx
<SitePilot theme={{ accentColor: '#8b5cf6' }} />
```

## Tool-Only Response Handling

When the AI uses tools without text, customize the fallback message:

```tsx
import { SitePilot, createFallbackMessageGenerator } from 'ai-site-pilot';

const generateFallback = createFallbackMessageGenerator({
  navigate_to_section: (args) => `Scrolled to **${args.section}**.`,
  show_service: (args) => `Showing details for **${args.serviceId}**.`,
  filter_products: (args) => `Filtered to **${args.category}** products.`,
});

<SitePilot
  apiEndpoint="/api/chat"
  generateFallbackMessage={generateFallback}
/>
```

## Full Props Reference

```typescript
interface SitePilotProps {
  // Required
  apiEndpoint: string;

  // Tool handling
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  generateFallbackMessage?: (toolName: string, args: Record<string, unknown>) => string;

  // UI customization
  suggestions?: Array<{ text: string; icon?: string }>;
  welcomeMessage?: string;
  placeholder?: string;
  defaultOpen?: boolean;
  position?: 'bottom-right' | 'bottom-left';

  // Theme
  theme?: {
    accent?: 'amber' | 'pink' | 'blue' | 'green' | 'purple' | 'red' | 'cyan' | 'orange';
    accentColor?: string;  // Hex color (overrides accent)
    backgroundColor?: string;
    radius?: number;
  };

  // Features
  features?: {
    speech?: boolean;      // Voice input
    tts?: boolean;         // Text-to-speech
    fullscreen?: boolean;  // Fullscreen toggle
  };
}
```

## Common Patterns

### E-commerce Site

```typescript
siteContent: {
  name: 'MyStore',
  type: 'online store',
  items: [
    { id: 'laptop-1', name: 'MacBook Pro', category: 'product', price: '$1999', inStock: true },
    { id: 'phone-1', name: 'iPhone 15', category: 'product', price: '$999', inStock: true },
  ],
  pages: ['home', 'products', 'cart', 'checkout'],
}

// Tools: search_products, filter_by_category, add_to_cart, open_product
```

### Portfolio Site

```typescript
siteContent: {
  name: 'Jane Developer',
  type: 'portfolio',
  items: [
    { id: 'project-1', name: 'Acme Dashboard', category: 'project', status: 'Live', tech: 'React, Node' },
    { id: 'project-2', name: 'FitTrack App', category: 'project', status: 'Live', tech: 'React Native' },
  ],
  pages: ['hero', 'projects', 'about', 'contact'],
}

// Tools: filter_projects, open_project_modal, navigate_to_section, open_contact
```

### SaaS Landing Page

```typescript
siteContent: {
  name: 'CloudSync',
  type: 'SaaS platform',
  description: 'Real-time data synchronization for teams',
  items: [
    { id: 'starter', name: 'Starter Plan', category: 'pricing', price: '$9/mo', features: '5 users, 10GB' },
    { id: 'pro', name: 'Pro Plan', category: 'pricing', price: '$29/mo', features: '25 users, 100GB' },
  ],
  faqs: [
    { question: 'Is there a free trial?', answer: 'Yes, 14-day free trial on all plans.' },
  ],
}

// Tools: navigate_to_section, show_pricing, open_signup, open_demo
```

## Troubleshooting

### Button only shows icon, no "Ask AI" text
Your Tailwind config isn't scanning the package:
```js
content: ['./node_modules/ai-site-pilot/dist/**/*.{js,mjs}']
```

### Theme colors not working
Use component props, not CSS variables:
```tsx
// Good
<SitePilot theme={{ accent: 'pink' }} />

// Bad - don't set CSS vars directly
```

### AI gives generic responses
Use `siteContent` to provide actual data about your site. The AI only knows what you tell it.

### Tools not executing
1. Check `onToolCall` is passed to SitePilot
2. Verify tool names match between API and client handler
3. Check browser console for errors

## Available Models

| Model | ID | Notes |
|-------|-----|-------|
| Gemini 2.0 Flash | `google/gemini-2.0-flash-exp:free` | **Free!** Default |
| GPT-4o | `openai/gpt-4o` | Best overall |
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` | Best for coding |
| Llama 3.1 70B | `meta-llama/llama-3.1-70b-instruct` | Open source |

See all models at [openrouter.ai/models](https://openrouter.ai/models)
