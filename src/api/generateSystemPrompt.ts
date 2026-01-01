/**
 * Auto-generate system prompts from site content
 * Makes it easy for any site to get a well-structured AI assistant
 */

export interface SiteContentItem {
  /** Unique identifier for the item */
  id: string;
  /** Display name */
  name: string;
  /** Category/type (e.g., 'product', 'service', 'team', 'class') */
  category?: string;
  /** Description of the item */
  description?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

export interface SiteContent {
  /** Name of the business/site */
  name: string;
  /** Brief description of what the site/business does */
  description?: string;
  /** Type of business (e.g., 'dance studio', 'portfolio', 'e-commerce') */
  type?: string;
  /** Personality/tone for the assistant (e.g., 'friendly', 'professional', 'warm') */
  personality?: string;
  /** Available pages/sections users can navigate to */
  pages?: string[];
  /** Content items (products, services, team members, etc.) */
  items?: SiteContentItem[];
  /** FAQs */
  faqs?: Array<{ question: string; answer: string }>;
  /** Contact information */
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
  };
  /** Additional context to include in the prompt */
  additionalContext?: string;
}

/**
 * Generate a system prompt from site content
 *
 * @example
 * ```ts
 * const prompt = generateSystemPrompt({
 *   name: 'Acme Dance Studio',
 *   type: 'dance studio',
 *   personality: 'warm and encouraging',
 *   pages: ['home', 'classes', 'teachers', 'schedule', 'contact'],
 *   items: [
 *     { id: 'ballet', name: 'Ballet', category: 'class', description: 'Classical ballet for ages 3-adult' },
 *     { id: 'jazz', name: 'Jazz', category: 'class', description: 'High-energy jazz for ages 6+' },
 *     { id: 'sarah', name: 'Sarah Johnson', category: 'teacher', description: 'Owner, 15 years experience' },
 *   ],
 *   contact: {
 *     email: 'info@acmedance.com',
 *     phone: '555-1234',
 *   },
 * });
 * ```
 */
export function generateSystemPrompt(content: SiteContent): string {
  const {
    name,
    description,
    type,
    personality = 'helpful and friendly',
    pages = [],
    items = [],
    faqs = [],
    contact,
    additionalContext,
  } = content;

  const sections: string[] = [];

  // Role and personality
  sections.push(`You are the AI assistant for ${name}${type ? `, a ${type}` : ''}.${description ? ` ${description}` : ''}`);
  sections.push(`Your personality is ${personality}. Be conversational but concise.`);

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, SiteContentItem[]>);

  // Content sections
  if (Object.keys(itemsByCategory).length > 0) {
    sections.push('\n## Available Content\n');

    for (const [category, categoryItems] of Object.entries(itemsByCategory)) {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1) + 's';
      sections.push(`### ${categoryTitle}`);

      for (const item of categoryItems) {
        let itemLine = `- **${item.name}** (id: "${item.id}")`;
        if (item.description) {
          itemLine += `: ${item.description}`;
        }
        // Include any extra fields
        const extraFields = Object.entries(item)
          .filter(([k]) => !['id', 'name', 'category', 'description'].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        if (extraFields) {
          itemLine += ` [${extraFields}]`;
        }
        sections.push(itemLine);
      }
      sections.push('');
    }
  }

  // Pages/Navigation
  if (pages.length > 0) {
    sections.push(`## Site Sections\nUsers can navigate to: ${pages.join(', ')}`);
  }

  // FAQs
  if (faqs.length > 0) {
    sections.push('\n## Frequently Asked Questions');
    for (const faq of faqs) {
      sections.push(`**Q: ${faq.question}**`);
      sections.push(`A: ${faq.answer}\n`);
    }
  }

  // Contact info
  if (contact) {
    sections.push('\n## Contact Information');
    if (contact.email) sections.push(`- Email: ${contact.email}`);
    if (contact.phone) sections.push(`- Phone: ${contact.phone}`);
    if (contact.address) sections.push(`- Address: ${contact.address}`);
    if (contact.hours) sections.push(`- Hours: ${contact.hours}`);
  }

  // Additional context
  if (additionalContext) {
    sections.push(`\n## Additional Information\n${additionalContext}`);
  }

  // Instructions
  sections.push(`
## Instructions
- When users ask about specific items, provide detailed information from the content above
- Use the available tools to navigate users to relevant pages or show them specific items
- If you don't know something, say so honestly - don't make up information
- Keep responses concise but helpful
- Reference specific items by their id when using tools`);

  return sections.join('\n');
}
