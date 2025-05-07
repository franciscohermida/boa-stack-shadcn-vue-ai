// In your test file (e.g., test-extraction.ts)
import { extractComponentDocSection } from './generate-nui-main'; // Adjust path as needed
import fs from 'fs/promises';

async function test() {
  const fullDocsContent = await fs.readFile('./gen/nuxt-ui-llms-full.txt', 'utf8');
  const buttonSection = extractComponentDocSection(fullDocsContent, 'Button');
  console.log("--- Button Section ---");
  console.log(buttonSection);
  console.log("--- End Button Section ---");

  // Add more tests for other sections or edge cases
}

test();