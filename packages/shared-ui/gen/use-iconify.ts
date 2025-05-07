import fs from 'fs/promises';
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { config } from "dotenv";
import { z } from "zod";
import path from "path";

config({ path: "./.env" });

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

const refactoredComponentSchema = z.object({
  refactoredContent: z.string().describe("The refactored Vue component content, using Iconify for icons."),
});

const outputDir = './src/components/ui-iconify';
const baseUiDir = './src/components/ui'; // Base directory for original components

async function main() {
  const componentNames = ['checkbox', 'button']; // Process components by name
  const skipExistingOutput = true; // Configuration flag to skip already converted files

  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Output directory ${outputDir} ensured.`);
  } catch (error) {
    console.error(`Error creating base output directory ${outputDir}:`, error);
    return;
  }

  for (const componentName of componentNames) {
    const componentPath = path.join(baseUiDir, componentName);
    console.log(`Processing component: ${componentName} in ${componentPath}`);

    try {
      const entries = await fs.readdir(componentPath);
      for (const entry of entries) {
        const filePath = path.join(componentPath, entry);
        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) {
            console.log(`Skipping non-file entry: ${filePath}`);
            continue;
          }

          // Determine output path for checking existence
          const relativeToUiDirForCheck = path.relative(baseUiDir, filePath);
          const outputPathForCheck = path.join(outputDir, relativeToUiDirForCheck);

          if (skipExistingOutput) {
            try {
              await fs.access(outputPathForCheck); // Check if file exists
              console.log(`Skipping already existing output file: ${outputPathForCheck}`);
              continue; // Skip to the next entry
            } catch (e) {
              // File doesn't exist, so proceed
            }
          }

          if (entry.endsWith('.vue')) {
            const originalContent = await fs.readFile(filePath, 'utf8');
            console.log(`Read file: ${filePath}`);

            const prompt = `
              You are an AI assistant that refactors Vue.js single file components (SFCs).
              Your task is to replace existing icon usages (e.g., lucide-vue-next, custom SVG components)
              with the Iconify icon component (e.g., <Icon icon="lucide:box" />).
              Ensure the script setup and template sections are correctly updated.
              Do not change any other logic or styling of the component.
              Only output the complete refactored Vue SFC content.

              Original component content:
              ---
              ${originalContent}
              ---
              Refactor the above component to use Iconify icons.
            `;

            console.log(`Generating refactored component for: ${filePath}`);
            const { object: refactoredComponent } = await generateObject({
              model: google("gemini-2.5-pro-exp-03-25"),
              mode: "json",
              prompt: prompt,
              schema: refactoredComponentSchema,
            });

            console.log(`Successfully generated refactored component for: ${filePath}`);

            const relativeToUiDir = path.relative(baseUiDir, filePath);
            const outputPath = path.join(outputDir, relativeToUiDir);

            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, refactoredComponent.refactoredContent);
            console.log(`Refactored component saved to: ${outputPath}`);

          } else if (entry.endsWith('.ts')) {
            const relativeToUiDir = path.relative(baseUiDir, filePath);
            const outputPath = path.join(outputDir, relativeToUiDir);

            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.copyFile(filePath, outputPath);
            console.log(`Copied TS file to: ${outputPath}`);
          }
        } catch (fileProcessingError) {
          console.error(`Error processing entry ${filePath}:`, fileProcessingError);
        }
      }
    } catch (dirError) {
      console.error(`Error reading component directory ${componentPath}:`, dirError);
    }
  }
}

main().catch(console.error);