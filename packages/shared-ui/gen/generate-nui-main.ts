import fs from 'fs/promises'
import path from 'path'
import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { config as dotenvConfig } from 'dotenv' // Renamed to avoid conflict
import { z } from 'zod'

dotenvConfig({ path: './.env' }) // Assuming .env is in the workspace root or relevant parent

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

// Schema for the AI's output for each component
const NuxtComponentSchema = z.object({
  componentName: z
    .string()
    .describe("The name of the Vue component, e.g., 'Button.vue' or 'Alert.vue'"),
  componentContent: z.string().describe('The full Vue.js SFC code for the component.'),
  indexTsContent: z
    .string()
    .describe('The content for the index.ts file, including exports or variants.'),
})

// --- Configuration Flags ---
const useFullDocumentationContext = false // Set to false to extract per-component sections
const debugPromptToFile = true; // Set to true to save the full prompt for each component to a file
// --- End Configuration Flags ---

// Define the Nuxt UI components to generate
// For each component, specify its shadcn-like name and the Nuxt UI documentation URL
const componentsToGenerate = [
  {
    name: 'button', // This will be used for folder name and base for ComponentName.vue
    nuxtUiDocsUrl: 'https://ui.nuxt.com/components/button',
    docSectionHeading: 'Button', // Heading used to extract component-specific docs
    featuresToImplement: [ // New property for targeted feature implementation
      'Loading state (including `loading` and `loading-auto` props, and `loading-icon` customization as described in Nuxt UI docs)'
    ]
    // We might add a field here to specify the base shadcn-vue component path if different
  },
  // Add more components here, e.g.:
  // {
  //   name: 'alert',
  //   nuxtUiDocsUrl: 'https://ui.nuxt.com/components/alert',
  //   docSectionHeading: 'Alert',
  // },
]

const baseShadcnUiDir = './src/components/ui-iconify'
const outputNuiDir = './src/components/nui'
const nuxtUiFullDocsPath = './gen/nuxt-ui-llms-full.txt' // Path to the full docs
const debugPromptsDir = './gen/debug_prompts' // Directory to save debug prompts

/**
 * Extracts a specific component's documentation section from the full text.
 * Searches for a line starting with "# {sectionHeadingText}" and extracts content
 * until the next line starting with "# " or end of document.
 */
export function extractComponentDocSection(fullDocs: string, sectionHeadingText: string): string {
  if (!sectionHeadingText) {
    console.warn('No sectionHeadingText provided. Cannot extract specific section.')
    return '' // Return empty string if no heading provided
  }
  // Ensure headings are matched at the beginning of a line.
  const startPattern = `\n# ${sectionHeadingText}`
  let startIndex = fullDocs.indexOf(startPattern)

  if (startIndex === -1) {
    const altStartPattern = `# ${sectionHeadingText}\n`
    if (fullDocs.startsWith(altStartPattern)) {
      startIndex = 0
    } else {
      console.warn(
        `Section heading "# ${sectionHeadingText}" not found. Cannot extract specific section.`,
      )
      return '' // Return empty string if section not found
    }
  }

  // Find the start of the next section (a line starting with "\n# ")
  // The search for the next heading should start after the current section's heading.
  let endIndex = fullDocs.indexOf('\n# ', startIndex + startPattern.length)

  if (endIndex === -1) {
    // If no next section heading is found, this section goes to the end of the document.
    return fullDocs.substring(startIndex)
  } else {
    return fullDocs.substring(startIndex, endIndex)
  }
}

export async function main() {
  console.log('Starting Nuxt UI component generation script...')
  console.log(`Configuration: useFullDocumentationContext = ${useFullDocumentationContext}`)

  let fullNuxtUiDocsContent = ''
  try {
    fullNuxtUiDocsContent = await fs.readFile(nuxtUiFullDocsPath, 'utf8')
    console.log(`Successfully read full Nuxt UI documentation from: ${nuxtUiFullDocsPath}`)
  } catch (error) {
    console.error(`Error reading Nuxt UI documentation file at ${nuxtUiFullDocsPath}:`, error)
    console.log(
      'Proceeding without Nuxt UI documentation. This will significantly impact generation quality.',
    )
    return // Exit if full docs are essential and not found
  }

  try {
    await fs.mkdir(outputNuiDir, { recursive: true })
    console.log(`Ensured base output directory exists: ${outputNuiDir}`)
  } catch (error) {
    console.error(`Error creating base output directory ${outputNuiDir}:`, error)
    return
  }

  for (const componentConfig of componentsToGenerate) {
    const componentNamePascalCase =
      componentConfig.name.charAt(0).toUpperCase() + componentConfig.name.slice(1)
    const vueFileName = `${componentNamePascalCase}.vue` // e.g., Button.vue
    const componentOutputDir = path.join(outputNuiDir, componentConfig.name) // e.g., ./src/components/nui/button

    console.log(`\nProcessing component: ${componentConfig.name}`)

    let docsForPrompt = fullNuxtUiDocsContent
    let docSourceDescription = 'the full Nuxt UI documentation provided below'

    if (!useFullDocumentationContext) {
      console.log(
        `Attempting to extract section: "${componentConfig.docSectionHeading}" from full docs.`,
      )
      docsForPrompt = extractComponentDocSection(
        fullNuxtUiDocsContent,
        componentConfig.docSectionHeading,
      )
      if (docsForPrompt === '') {
        // Check if extraction returned an empty string (section not found)
        const errorMessage = `Error: Could not extract specific documentation section for "${componentConfig.docSectionHeading}". Halting execution as strict section extraction is required.`
        console.error(errorMessage)
        throw new Error(errorMessage) // Throw an error to stop execution
      } else {
        console.log(`Successfully extracted section for "${componentConfig.docSectionHeading}".`)
        docSourceDescription = 'the Nuxt UI component documentation section provided below'
      }
    }

    try {
      await fs.mkdir(componentOutputDir, { recursive: true })
      console.log(`Ensured output directory: ${componentOutputDir}`)

      let existingShadcnComponentContent = ''
      let existingShadcnIndexTsContent = ''
      const shadcnComponentPath = path.join(baseShadcnUiDir, componentConfig.name, vueFileName)
      try {
        existingShadcnComponentContent = await fs.readFile(shadcnComponentPath, 'utf8')
        console.log(`Read existing shadcn-vue component: ${shadcnComponentPath}`)

        // Attempt to read the corresponding index.ts from the shadcn-vue component directory
        const shadcnIndexTsPath = path.join(baseShadcnUiDir, componentConfig.name, 'index.ts')
        try {
          existingShadcnIndexTsContent = await fs.readFile(shadcnIndexTsPath, 'utf8')
          console.log(`Read existing shadcn-vue index.ts: ${shadcnIndexTsPath}`)
        } catch (indexReadError) {
          console.log(
            `Optional: Could not read existing shadcn-vue index.ts at ${shadcnIndexTsPath}. Proceeding without it.`,
          )
          // It's okay if it doesn't exist
        }
      } catch (readError) {
        console.log(
          `Optional: Could not read existing shadcn-vue component at ${shadcnComponentPath}. Proceeding without it.`,
        )
      }

      let shadcnVueBaseCodeBlock = ''
      if (existingShadcnComponentContent) {
        shadcnVueBaseCodeBlock = `
        The new component you are creating ('${vueFileName}') should act as a wrapper and enhancement around an existing base component.
        The base component is the '${componentNamePascalCase}' component from the 'ui-iconify' library, whose code is provided below.
        You should import this base component (e.g., import UiIconify${componentNamePascalCase} from '../../ui-iconify/${componentConfig.name}/${vueFileName}') and use it within your new component's template.

        Your primary task is to:
        1.  Expose props on your new component ('${vueFileName}') that match the API of the Nuxt UI '${componentConfig.name}' component (see NUXT UI DOCUMENTATION CONTEXT).
        2.  Map these props to the props of the underlying UiIconify${componentNamePascalCase} where they correspond.
        3.  For features of the Nuxt UI component not present in UiIconify${componentNamePascalCase} (e.g., a 'loading' state that shows a spinner), implement the additional template logic and script setup within your new component, using UiIconify${componentNamePascalCase} as the core interactive element.
        4.  Ensure slots are managed correctly, passing through slots from your new component to the underlying UiIconify${componentNamePascalCase} as appropriate.

        --- BEGIN EXISTING UI-ICONIFY COMPONENT (${vueFileName}) (TO BE WRAPPED) ---
        ${existingShadcnComponentContent}
        --- END EXISTING UI-ICONIFY COMPONENT (${vueFileName}) (TO BE WRAPPED) ---
        `
        if (existingShadcnIndexTsContent) {
          shadcnVueBaseCodeBlock += `

        --- BEGIN EXISTING UI-ICONIFY INDEX.TS (REFERENCE FOR WRAPPED COMPONENT) ---
        ${existingShadcnIndexTsContent}
        --- END EXISTING UI-ICONIFY INDEX.TS (REFERENCE FOR WRAPPED COMPONENT) ---
          `
        }
      } else {
        shadcnVueBaseCodeBlock = `
        Since no direct base 'ui-iconify' component was found to wrap, you should focus on creating a new component
        from scratch based on the provided Nuxt UI documentation context and shadcn-vue principles.
        This means you will implement the full component logic and template yourself.
        `
      }

      const prompt = `
        You are an AI assistant tasked with creating advanced Vue.js Single File Components (SFCs)
        for a component library that follows the shadcn-vue philosophy (composability, accessibility, unstyled by default but with a recipe for styling).
        The goal is to create a new component in the 'nui' (Nuxt UI inspired) collection that mirrors the features and props
        of a Nuxt UI component.

        **Strategy**:
        ${existingShadcnComponentContent ?
          `You will achieve this by **creating a wrapper component**. This new 'nui' component will import and use an existing base component from the 'ui-iconify' library (detailed below).` :
          `Since a base 'ui-iconify' component to wrap was not found, you will create this 'nui' component from scratch, implementing the features of the Nuxt UI component while adhering to shadcn-vue principles.`
        }
        ${(componentConfig.featuresToImplement && componentConfig.featuresToImplement.length > 0) ?
          `
        **Specific Features to Implement**:
        Focus ONLY on implementing the following feature(s) onto the base 'ui-iconify' component:
        ${componentConfig.featuresToImplement.map(feature => `- ${feature}`).join('\n        ')}
        Refer to the Nuxt UI documentation context to understand the props, behavior, and styling nuances of these specific features.
        Ensure that other props from the base 'ui-iconify' component remain functional and are correctly passed through from the new 'nui' component.
          ` :
          `
        **Feature Implementation Scope**:
        Your goal is to implement as many features and props from the Nuxt UI documentation as possible, creating a comprehensive 'nui' component that wraps the base 'ui-iconify' component.
          `
        }

        Component to create in the 'nui' collection: '${componentConfig.name}'

        The new component should be named '${vueFileName}' (e.g., Button.vue, Alert.vue) and placed in a folder named '${componentConfig.name}'.
        It should also have an 'index.ts' file. This 'index.ts' must export the main Vue component using its simple PascalCase name (e.g., export { default as ${componentNamePascalCase} } from './${vueFileName}';).
        Any associated types or variant definitions intended for export should also use clear, unprefixed names.

        PRIMARY SOURCE OF TRUTH FOR NUXT UI COMPONENT FEATURES AND PROPS:
        The following text block contains ${docSourceDescription}. Use this as your main reference.
        The Nuxt UI Documentation URL (${componentConfig.nuxtUiDocsUrl}) is a secondary reference if needed.
        --- BEGIN NUXT UI DOCUMENTATION CONTEXT ---
        ${docsForPrompt}
        --- END NUXT UI DOCUMENTATION CONTEXT ---

        Core requirements:
        1.  **Feature Adherence**:
            ${(componentConfig.featuresToImplement && componentConfig.featuresToImplement.length > 0) ?
              `Accurately implement ONLY the specific features listed in the 'Specific Features to Implement' section above. Use the Nuxt UI documentation context to understand the API (props, events, slots) and behavior of these listed features for '${componentConfig.name}'.` :
              `Implement as many features and props from the Nuxt UI component (detailed in the documentation context) as possible for '${componentConfig.name}', as outlined in the 'Feature Implementation Scope' section above.`
            }
        2.  The component should be written in Vue 3 (Composition API with <script setup>).
        3.  **Vue Project Compatibility**: The generated code must be standard Vue 3 and should NOT use any Nuxt-specific APIs, composables (e.g., \`useAppConfig()\`, \`useNuxtApp()\`, Nuxt auto-imports), or conventions that would prevent it from working in a general Vue 3 project (outside of Nuxt). All imports must be explicit and from standard Vue, JavaScript/TypeScript, or the 'ui-iconify' base (referring to the wrapped component's library).
        4.  Follow shadcn-vue principles:
            *   Prioritize accessibility (ARIA attributes, keyboard navigation).
            *   Keep it unstyled by default but easy to style via props or CSS variables/classes.
            *   **Icons**: The base component (from the 'ui-iconify' library) should already use Iconify. Continue this pattern. **Prioritize using the Lucide icon set (e.g., using an Iconify tag like '<Icon icon=\"lucide:some-icon\" />') for all icons.** If a suitable Lucide icon isn\'t available for a specific Nuxt UI feature, you may use another Iconify set, but Lucide is preferred. For example: use an Iconify tag like '<Icon icon=\"lucide:chevron-down\" class=\"some-styles\" />'.
            *   The component should be self-contained in its .vue file.
        5.  Generate an 'index.ts' file. This file should at least export the component (e.g., export { default as ${componentNamePascalCase} } from './${vueFileName}';).
            If the component has variants (like different styles or sizes in shadcn-vue), define them here using a pattern similar to 'cva' (class-variance-authority) or a simple object/function if 'cva' is not directly used.
            All exports from 'index.ts' should use simple, unprefixed names.
        6.  **Import Paths & Cyclical Dependencies**: Ensure all import paths are correct and do not create cyclical dependencies. When wrapping the base 'ui-iconify' component, it should be imported using a relative path like '../../ui-iconify/...'.

        ${shadcnVueBaseCodeBlock}

        Provide the output as a JSON object with three keys:
        - 'componentName': The filename for the Vue component (e.g., "Button.vue").
        - 'componentContent': The full SFC code for '${vueFileName}'.
        - 'indexTsContent': The full content for 'index.ts'.
      `

      console.log(`Generating component files for ${componentConfig.name} using AI...`)

      if (debugPromptToFile) {
        try {
          await fs.mkdir(debugPromptsDir, { recursive: true });
          const promptFilePath = path.join(debugPromptsDir, `prompt-${componentConfig.name}.txt`);
          await fs.writeFile(promptFilePath, prompt);
          console.log(`DEBUG: Prompt for ${componentConfig.name} saved to: ${promptFilePath}`);
        } catch (debugError) {
          console.error(`DEBUG: Error saving prompt for ${componentConfig.name}:`, debugError);
        }
      }

      const { object: generatedFiles } = await generateObject({
        model: google('gemini-2.5-pro-preview-05-06'), // recently released model, use "gemini-2.5-pro-exp-03-25" if this doesn't work
        mode: 'json',
        prompt: prompt,
        schema: NuxtComponentSchema,
      })

      // Validate componentName (optional, but good practice)
      if (generatedFiles.componentName !== vueFileName) {
        console.warn(
          `AI suggested component name '${generatedFiles.componentName}' differs from expected '${vueFileName}'. Using expected name.`,
        )
      }

      const vueFilePath = path.join(componentOutputDir, vueFileName)
      const indexTsFilePath = path.join(componentOutputDir, 'index.ts')

      await fs.writeFile(vueFilePath, generatedFiles.componentContent)
      console.log(`Vue component saved to: ${vueFilePath}`)

      await fs.writeFile(indexTsFilePath, generatedFiles.indexTsContent)
      console.log(`index.ts saved to: ${indexTsFilePath}`)
    } catch (error) {
      console.error(`Error processing component ${componentConfig.name}:`, error)
      // Decide if you want to continue with other components or stop
    }
  }
  console.log('\nNuxt UI component generation script finished.')
}

// main().catch(console.error);
