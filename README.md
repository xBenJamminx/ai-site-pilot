# ai-site-pilot

[![npm version](https://img.shields.io/npm/v/ai-site-pilot)](https://www.npmjs.com/package/ai-site-pilot)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-ff5e5b?logo=ko-fi)](https://ko-fi.com/xBenJamminx)

AI chat widget that can **control and navigate your website**. Unlike typical chatbots that just answer questions, Site Pilot can take actions—scroll to sections, open modals, filter content, and more.

## Features

- 🎯 **Tool System** - Define custom actions the AI can take on your site
- 🌊 **Streaming** - Real-time streaming responses with SSE
- 🎤 **Speech** - Voice input and text-to-speech output
- 🎨 **Themeable** - CSS variables for easy customization
- 📱 **Responsive** - Works on all screen sizes
- ⚡ **Vercel AI SDK** - Works with any LLM provider

## How It Works

The package provides the chat UI and streaming infrastructure. **You teach the AI about your specific site** through:

1. **System Prompt** - Tell the AI what sections, data, and features exist on your site
2. **Tool Definitions** - Define what actions the AI can take (filter, navigate, open modals)
3. **Client Handlers** - Write the code that actually executes those actions

```
User: "Show me your mobile apps"
         ↓
   AI understands request
         ↓
   AI calls filter_by_category("Mobile") tool
         ↓
   Your handler receives the call
         ↓
   Your code filters the UI
```

The AI doesn't automatically know your site structure—you teach it via the system prompt. See the [complete example](#teaching-the-ai-your-site) below.

## Installation

```bash
npm install ai-site-pilot

# Choose your backend (pick ONE):
npm install @google/genai          # Gemini (recommended, no AI SDK needed)
npm install ai @ai-sdk/google      # Vercel AI SDK with Gemini
npm install ai @ai-sdk/openai      # Vercel AI SDK with OpenAI
```

## Quick Start

### 1. Create the API Route

**Option A: Gemini Direct (Recommended)** - No Vercel AI SDK needed!

```typescript
// app/api/chat/route.ts
import { createGeminiHandler } from 'ai-site-pilot/api';
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

export const POST = createGeminiHandler({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  model: 'gemini-2.0-flash',
  systemPrompt: `You are a helpful assistant for our website.
You can navigate users to different sections using the navigate tool.`,
  tools: [navigateTool],
});
```

**Option B: Vercel AI SDK** - Works with any AI SDK provider

```typescript
// app/api/chat/route.ts
import { createChatHandler } from 'ai-site-pilot/api';
import { defineTool } from 'ai-site-pilot/tools';
import { google } from '@ai-sdk/google';

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

export const POST = createChatHandler({
  model: google('gemini-2.0-flash'),
  systemPrompt: `You are a helpful assistant for our website.
You can navigate users to different sections using the navigate tool.`,
  tools: [navigateTool],
});
```

### 2. Add the Component

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

## API Reference

### `<SitePilot />`

Main chat widget component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiEndpoint` | `string` | required | API endpoint for chat |
| `theme` | `SitePilotTheme` | `{}` | Theme configuration |
| `suggestions` | `Suggestion[]` | `[]` | Suggestion prompts |
| `features` | `SitePilotFeatures` | `{}` | Feature toggles |
| `onToolCall` | `(name, args) => void` | - | Tool call handler |
| `defaultOpen` | `boolean` | `false` | Initial open state |
| `placeholder` | `string` | `'Type a message...'` | Input placeholder |
| `welcomeMessage` | `string` | `'Hi! I'm here to help...'` | Welcome message |

#### Theme Options

```typescript
interface SitePilotTheme {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  borderRadius?: number;

  // Colors - all accept CSS color values (hex, rgb, hsl)
  accentColor?: string;         // Primary accent '#f59e0b'
  accentColorDark?: string;     // Gradient end '#d97706'
  backgroundColor?: string;      // Panel background '#0F0720'
  textColor?: string;           // Primary text '#ffffff'
  textMutedColor?: string;      // Secondary text '#a1a1aa'
  borderColor?: string;         // Border 'rgba(255,255,255,0.1)'
  userMessageBg?: string;       // User message bubble
  assistantMessageBg?: string;  // Assistant message bubble
}
```

#### Feature Toggles

```typescript
interface SitePilotFeatures {
  speech?: boolean;      // Voice input (default: true)
  tts?: boolean;         // Text-to-speech (default: true)
  fullscreen?: boolean;  // Fullscreen mode (default: true)
  suggestions?: boolean; // Show suggestions (default: true)
}
```

### `createGeminiHandler()`

Factory for creating Next.js API route handlers using Gemini directly (no AI SDK needed).

```typescript
import { createGeminiHandler } from 'ai-site-pilot/api';

export const POST = createGeminiHandler({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,  // Optional, uses env var by default
  model: 'gemini-2.0-flash',                          // Default: gemini-2.0-flash
  systemPrompt: 'You are a helpful assistant...',
  tools: [myTool1, myTool2],
  temperature: 0.7,
});
```

### `createChatHandler()`

Factory for creating Next.js API route handlers using Vercel AI SDK.

```typescript
import { createChatHandler } from 'ai-site-pilot/api';

export const POST = createChatHandler({
  model: google('gemini-2.0-flash'),  // Any Vercel AI SDK model
  systemPrompt: 'You are a helpful assistant...',
  tools: [myTool1, myTool2],
  temperature: 0.7,
  maxTokens: 1000,
});
```

### `defineTool()`

Helper for defining tools with type safety.

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
  handler: async ({ query, category }) => {
    // Client-side handler (optional)
    const results = await searchProducts(query, category);
    displayResults(results);
  },
});
```

### `useChat()`

Hook for custom chat implementations.

```typescript
import { useChat } from 'ai-site-pilot/hooks';

function MyCustomChat() {
  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    clearMessages,
  } = useChat({
    apiEndpoint: '/api/chat',
    onToolCall: (name, args) => {
      // Handle tool calls
    },
  });

  return (
    // Your custom UI
  );
}
```

## Styling

### CSS Variables

Override these variables to customize the appearance:

```css
.pilot-container {
  --pilot-accent-h: 38;       /* Hue */
  --pilot-accent-s: 92%;      /* Saturation */
  --pilot-accent-l: 50%;      /* Lightness */
  --pilot-bg: #0F0720;        /* Background */
  --pilot-text: #ffffff;       /* Text color */
  --pilot-text-muted: #a1a1aa; /* Muted text */
  --pilot-border: rgba(255, 255, 255, 0.1);
  --pilot-radius: 24px;
}
```

### Tailwind Integration

If using Tailwind, you can extend your config:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        pilot: {
          accent: 'hsl(var(--pilot-accent-h), var(--pilot-accent-s), var(--pilot-accent-l))',
        },
      },
    },
  },
};
```

## Use Cases

### E-commerce

```typescript
const tools = [
  defineTool({
    name: 'search_products',
    description: 'Search product catalog',
    parameters: { /* ... */ },
  }),
  defineTool({
    name: 'add_to_cart',
    description: 'Add item to shopping cart',
    parameters: { /* ... */ },
  }),
  defineTool({
    name: 'show_category',
    description: 'Filter products by category',
    parameters: { /* ... */ },
  }),
];
```

### Documentation Sites

```typescript
const tools = [
  defineTool({
    name: 'search_docs',
    description: 'Search documentation',
    parameters: { /* ... */ },
  }),
  defineTool({
    name: 'navigate_to_page',
    description: 'Go to a documentation page',
    parameters: { /* ... */ },
  }),
];
```

### Portfolio Sites

```typescript
const tools = [
  defineTool({
    name: 'open_project',
    description: 'Open project details modal',
    parameters: { /* ... */ },
  }),
  defineTool({
    name: 'filter_by_category',
    description: 'Filter projects by category',
    parameters: { /* ... */ },
  }),
];
```

## Custom API Implementation

If you need to implement your own API route (e.g., using a different AI provider), the widget expects Server-Sent Events (SSE) in this format:

### SSE Streaming Format

```
data: {"type":"text","content":"Hello, "}

data: {"type":"text","content":"how can I help?"}

data: {"type":"tool","name":"navigate","args":{"section":"products"}}

data: {"type":"done"}
```

#### Event Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Streaming text chunk | `{"type":"text","content":"Hello"}` |
| `tool` | Tool/function call | `{"type":"tool","name":"navigate","args":{"section":"home"}}` |
| `done` | Stream complete | `{"type":"done"}` |
| `error` | Error occurred | `{"type":"error","message":"Something went wrong"}` |

### SSE Utilities

Use the built-in SSE helpers for custom implementations:

```typescript
import { createSSEEncoder, getSSEHeaders } from 'ai-site-pilot/api';

export async function POST(req: Request) {
  const sse = createSSEEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Stream text
      controller.enqueue(sse.encodeText('Hello!'));

      // Send tool call
      controller.enqueue(sse.encodeTool('navigate', { section: 'products' }));

      // Done
      controller.enqueue(sse.encodeDone());
      controller.close();
    },
  });

  return new Response(stream, { headers: getSSEHeaders() });
}
```

## Handling Tool-Only Responses

When the AI calls tools without providing text, you can customize the fallback message:

```typescript
import { SitePilot, createFallbackMessageGenerator } from 'ai-site-pilot';

const generateFallback = createFallbackMessageGenerator({
  navigate: (args) => `Scrolled to **${args.section}** section.`,
  filter_products: (args) => `Showing **${args.category}** products.`,
  search: (args) => `Found results for "${args.query}".`,
});

<SitePilot
  apiEndpoint="/api/chat"
  generateFallbackMessage={generateFallback}
/>
```

## Requirements

- React 18+ or React 19
- Next.js 13+ (for API routes)
- One of:
  - `@google/genai` (Gemini direct - recommended)
  - `ai` + provider package (Vercel AI SDK)

## License

MIT
