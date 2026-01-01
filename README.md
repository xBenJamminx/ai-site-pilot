# ai-site-pilot

[![npm version](https://img.shields.io/npm/v/ai-site-pilot)](https://www.npmjs.com/package/ai-site-pilot)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-ff5e5b?logo=ko-fi)](https://ko-fi.com/xBenJamminx)

AI chat widget that can **control and navigate your website**. Unlike typical chatbots that just answer questions, Site Pilot can take actions—scroll to sections, open modals, filter content, and more.

Works with any AI model (Gemini, GPT-4, Claude, Llama) via [OpenRouter](https://openrouter.ai).

## Features

- 🎯 **Tool System** - Define custom actions the AI can take on your site
- 🌊 **Streaming** - Real-time streaming responses
- 🤖 **Any Model** - GPT-4, Claude, Gemini, Llama - just change one string
- 🎤 **Speech** - Voice input and text-to-speech output
- 🎨 **Themeable** - CSS variables for easy customization
- 📱 **Responsive** - Works on all screen sizes

## Installation

```bash
npm install ai-site-pilot
```

## Setup

### Tailwind CSS Configuration (Required)

If you're using Tailwind CSS, add ai-site-pilot to your content config so Tailwind generates the necessary classes:

```js
// tailwind.config.js or tailwind.config.ts
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    // Add this line:
    './node_modules/ai-site-pilot/dist/**/*.{js,mjs}',
  ],
  // ...
}
```

**Without this, the button text ("Ask AI") and other responsive styles won't work correctly.**

### Import Styles

Make sure to import the CSS file in your component:

```tsx
import 'ai-site-pilot/styles.css';
```

## Quick Start

### 1. Get an OpenRouter API Key

Sign up at [openrouter.ai](https://openrouter.ai) and get your API key. Add credits to your account for API usage.

### 2. Create the API Route

```typescript
// app/api/chat/route.ts
import { createHandler } from 'ai-site-pilot/api';
import { defineTool } from 'ai-site-pilot/tools';

const navigateTool = defineTool({
  name: 'navigate',
  description: 'Navigate to a section of the page',
  parameters: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        description: 'Section to navigate to',
        enum: ['home', 'products', 'about', 'contact'],
      },
    },
    required: ['section'],
  },
});

export const POST = createHandler({
  model: 'google/gemini-2.0-flash',  // Or use any OpenRouter model
  systemPrompt: `You are a helpful assistant for our website.
You can navigate users to different sections using the navigate tool.`,
  tools: [navigateTool],
});
```

### 3. Add the Component

```tsx
// app/layout.tsx or components/ChatWidget.tsx
'use client';

import { SitePilot } from 'ai-site-pilot';
import 'ai-site-pilot/styles.css';

export function ChatWidget() {
  return (
    <SitePilot
      apiEndpoint="/api/chat"
      suggestions={[
        { text: 'Show me products', icon: '🛍️' },
        { text: 'Take me to contact', icon: '📧' },
      ]}
      onToolCall={(name, args) => {
        if (name === 'navigate') {
          document.getElementById(args.section as string)?.scrollIntoView({
            behavior: 'smooth',
          });
        }
      }}
    />
  );
}
```

### 4. Add Environment Variable

```bash
# .env.local
OPENROUTER_API_KEY=sk-or-...
```

That's it!

## Available Models

Change the `model` string to use any model:

| Model | ID | Notes |
|-------|-----|-------|
| Gemini 2.0 Flash | `google/gemini-2.0-flash` | Fast, affordable (default) |
| GPT-4o | `openai/gpt-4o` | Best overall |
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` | Best for coding |
| Llama 3.1 70B | `meta-llama/llama-3.1-70b-instruct` | Open source |

See all models at [openrouter.ai/models](https://openrouter.ai/models)

## API Reference

### `createHandler()`

Creates a Next.js API route handler. You can use either `systemPrompt` (manual) or `siteContent` (auto-generated).

**Option 1: Auto-generated prompt with `siteContent`** (Recommended)

```typescript
import { createHandler } from 'ai-site-pilot/api';

export const POST = createHandler({
  model: 'google/gemini-2.0-flash',
  siteContent: {
    name: 'Acme Dance Studio',
    type: 'dance studio',
    description: 'Premier dance education since 1995',
    personality: 'warm and encouraging',
    pages: ['home', 'classes', 'teachers', 'schedule', 'contact'],
    items: [
      { id: 'ballet', name: 'Ballet', category: 'class', description: 'Classical ballet for ages 3-adult', price: '$80/month' },
      { id: 'jazz', name: 'Jazz', category: 'class', description: 'High-energy jazz for ages 6+', price: '$75/month' },
      { id: 'sarah', name: 'Sarah Johnson', category: 'teacher', description: 'Owner & lead instructor, 15 years experience' },
    ],
    faqs: [
      { question: 'What should I wear?', answer: 'Leotard and ballet slippers for ballet, comfortable athletic wear for jazz.' },
    ],
    contact: {
      email: 'info@acmedance.com',
      phone: '555-1234',
      hours: 'Mon-Sat 9am-8pm',
    },
  },
  tools: [navigateTool, showClassTool],
});
```

The AI automatically knows about your content and can answer questions like "What classes do you offer?" with specific details.

**Option 2: Manual `systemPrompt`**

```typescript
export const POST = createHandler({
  systemPrompt: 'You are a helpful assistant for Acme Dance Studio...',
  tools: [navigateTool],
});
```

**Full options:**

```typescript
createHandler({
  // Content (use ONE of these)
  siteContent: { ... },        // Auto-generate prompt from your content
  systemPrompt: '...',         // Or write your own prompt

  // Optional
  apiKey: process.env.OPENROUTER_API_KEY,  // Uses env var by default
  model: 'google/gemini-2.0-flash',  // Default (free!)
  tools: [myTool1, myTool2],
  temperature: 0.7,
  siteUrl: 'https://mysite.com',  // Shown in OpenRouter dashboard
  siteName: 'My Site',
});
```

### `<SitePilot />`

Main chat widget component.

```tsx
<SitePilot
  apiEndpoint="/api/chat"
  suggestions={[{ text: 'Help me', icon: '❓' }]}
  onToolCall={(name, args) => { /* handle tool calls */ }}
  theme={{ accent: 'pink' }}  // or accentColor: '#ec4899'
  features={{ speech: true, tts: true }}
  welcomeMessage="Hi! How can I help?"
  placeholder="Type a message..."
  defaultOpen={false}
/>
```

### Theme Presets

Use the `accent` prop for easy theming:

| Preset | Color |
|--------|-------|
| `amber` | Default orange/amber |
| `pink` | Hot pink |
| `blue` | Primary blue |
| `green` | Emerald green |
| `purple` | Violet purple |
| `red` | Coral red |
| `cyan` | Teal cyan |
| `orange` | Bright orange |

Or use `accentColor` with any hex color: `accentColor: '#8b5cf6'`

### `defineTool()`

Helper for defining tools.

```typescript
import { defineTool } from 'ai-site-pilot/tools';

const searchTool = defineTool({
  name: 'search_products',
  description: 'Search for products by query',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search terms' },
      category: { type: 'string', enum: ['electronics', 'clothing'] },
    },
    required: ['query'],
  },
});
```

## Custom API Implementation

If you need to use a different AI provider, implement this SSE format:

```
data: {"type":"text","content":"Hello, "}
data: {"type":"text","content":"how can I help?"}
data: {"type":"tool","name":"navigate","args":{"section":"products"}}
data: {"type":"done"}
```

Use the built-in SSE helpers:

```typescript
import { createSSEEncoder, getSSEHeaders } from 'ai-site-pilot/api';

export async function POST(req: Request) {
  const sse = createSSEEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse.encodeText('Hello!'));
      controller.enqueue(sse.encodeTool('navigate', { section: 'products' }));
      controller.enqueue(sse.encodeDone());
      controller.close();
    },
  });

  return new Response(stream, { headers: getSSEHeaders() });
}
```

## Handling Tool-Only Responses

When the AI calls tools without text, customize the fallback:

```typescript
import { SitePilot, createFallbackMessageGenerator } from 'ai-site-pilot';

const generateFallback = createFallbackMessageGenerator({
  navigate: (args) => `Scrolled to **${args.section}**.`,
  filter: (args) => `Showing **${args.category}** items.`,
});

<SitePilot
  apiEndpoint="/api/chat"
  generateFallbackMessage={generateFallback}
/>
```

## Requirements

- React 18+ or React 19
- Next.js 13+ (for API routes)
- Tailwind CSS (for responsive styles)
- OpenRouter API key (free at [openrouter.ai](https://openrouter.ai))

## Troubleshooting

### Button only shows icon, no "Ask AI" text

Your Tailwind config isn't scanning the package. Add this to your `tailwind.config.js`:

```js
content: [
  // ... your paths
  './node_modules/ai-site-pilot/dist/**/*.{js,mjs}',
]
```

### Theme accent color not working

Make sure you're using the `accent` prop (preset) or `accentColor` prop (custom hex):

```tsx
// Using preset
<SitePilot theme={{ accent: 'pink' }} />

// Using custom color
<SitePilot theme={{ accentColor: '#ec4899' }} />
```

Don't set CSS variables directly—use the component props.

### Tools not executing

1. Make sure you're handling tool calls in `onToolCall`:
```tsx
<SitePilot
  onToolCall={(name, args) => {
    console.log('Tool called:', name, args);
    // Handle the tool...
  }}
/>
```

2. Check browser console for errors

### "I've made some changes" generic message

Use `generateFallbackMessage` to customize messages when the AI uses tools without text:

```tsx
import { createFallbackMessageGenerator } from 'ai-site-pilot';

const generateFallback = createFallbackMessageGenerator({
  navigate: (args) => `Navigated to ${args.section}`,
  filter: (args) => `Filtered by ${args.category}`,
});

<SitePilot generateFallbackMessage={generateFallback} />
```

## License

MIT
