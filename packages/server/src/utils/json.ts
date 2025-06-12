import { jsonrepair } from 'jsonrepair';

export function repairJsonOutput(content: string): string {
  content = content.trim();
  if (content.startsWith('{') || content.startsWith('[') || content.includes('```json') || content.includes('```ts')) {
    // If content is wrapped in ```json code block, extract the JSON part
    if (content.startsWith('```json')) {
      content = content.replace('```json', '');
    }

    if (content.startsWith('```ts')) {
      content = content.replace('```ts', '');
    }

    if (content.endsWith('```')) {
      content = content.replace('```', '');
    }
  }

  // Try to repair and parse JSON
  const repairedContent = JSON.parse(jsonrepair(content));
  return JSON.stringify(repairedContent);
}
