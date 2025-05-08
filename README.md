# POC: AI-Driven Shared UI Library with shadcn-vue

This project is a Proof of Concept (POC) demonstrating how to build a shared UI component library for a monorepo, using [shadcn-vue](https://www.shadcn-vue.com/) as the foundational component set. The core idea is to leverage AI to iterate upon and customize these base components to fit specific needs across multiple applications.

## Core Concept

The primary goal is to explore the feasibility of using AI to:

1.  **Adapt Base Components**: Modify existing `shadcn-vue` components to align with project-specific requirements or preferences.
2.  **Layer Advanced Features**: Introduce new functionalities, potentially inspired by other UI libraries, on top of the solid foundation provided by `shadcn-vue`.
3.  **Maintain Clarity and Composability**: Ensure that even with added features, the components remain maintainable, composable, and as close as possible to the original `shadcn-vue` philosophy.

This approach allows for rapid development of a personalized UI library that benefits from the well-architected `shadcn-vue` components while being flexible enough to incorporate advanced or specific features as needed.

## AI-Powered Iteration Examples

To demonstrate this concept, this POC includes two example scripts that use AI (specifically, Google's Generative AI models via the AI SDK) to modify and enhance components:

### 1. Refactoring Icon Usage (`gen/use-iconify.ts`)

*   **Purpose**: This script iterates through a predefined list of `shadcn-vue` components (sourced from `./src/components/ui`) and refactors their icon usage.
*   **Process**: It replaces instances of `lucide-vue-next` icon components with `iconify-vue` (using `<Icon icon="..." />` syntax). This is a relatively straightforward refactoring task that AI can handle efficiently.
*   **Output**: The modified components are placed in `./src/components/ui-iconify`.

### 2. Implementing Nuxt UI Features (`gen/generate-nui-main.ts`)

*   **Purpose**: This script demonstrates a more complex task: layering specific features from [Nuxt UI](https://ui.nuxt.com/) onto existing `shadcn-vue` components. `shadcn-vue` provides excellent, composable base components, but sometimes lacks more advanced, opinionated features found in libraries like Nuxt UI (e.g., built-in loading states for buttons, including `loading` and `loading-auto` props).
*   **Process**:
    *   It targets a specific `shadcn-vue` component (e.g., the button from `./src/components/ui-iconify/button`).
    *   It aims to implement *only* the desired features from the corresponding Nuxt UI component.
    *   To provide context to the AI, it uses a local copy of the Nuxt UI documentation (`./gen/nuxt-ui-llms-full.txt`). The script can extract the relevant section for the component being worked on, ensuring the AI has focused information.
    *   The AI then generates a new wrapper component (e.g., `./src/components/nui/button/Button.vue`) that imports the base `ui-iconify` button and adds the specified Nuxt UI features (props, template logic, etc.).
*   **Benefit**: This approach keeps the enhanced component maintainable by clearly separating the base `shadcn-vue` logic from the newly added Nuxt UI-inspired features. It avoids a full rewrite and focuses on targeted enhancements.

## Project Goal

The overarching goal of this project is to explore and validate the idea that **AI can be a powerful tool for creating and maintaining personalized UI libraries by iterating on robust foundations like shadcn-vue.** Instead of building everything from scratch or being locked into the exact feature set of an existing library, we can use AI to:

*   **Customize**: Tailor components to our precise visual and functional needs.
*   **Extend**: Intelligently add features, drawing inspiration and even direct documentation context from other libraries (like Nuxt UI in this example).
*   **Automate**: Handle repetitive refactoring or boilerplate generation tasks.

This POC serves as a starting point for further exploration into AI-assisted UI development.

## Setup and Usage

To run the AI generation scripts, you'll need to configure your environment and use the correct commands:

### 1. Environment Setup

*   **Google API Key**: The scripts use Google's Generative AI models. You need to provide your API key.
    1.  Copy the example environment file: `cp .env.example .env` (or create `.env` manually).
    2.  Open the `.env` file and add your Google AI API Key:
        ```
        GOOGLE_AI_API_KEY=YOUR_API_KEY_HERE
        ```

### 2. Running the Scripts

Ensure you have `pnpm` and `tsx` installed. The scripts can be run from the root of the `packages/shared-ui` directory.

*   **To run the icon refactoring script (lucide-vue-next to Iconify):**
    ```bash
    pnpm tsx gen/use-iconify.ts
    ```

*   **To run the Nuxt UI feature implementation script:**
    ```bash
    pnpm tsx gen/generate-nui-main.ts
    ```


## TODO

- [ ] local project mcp server/s to provide context to AI when manually editing the outputed files.
- [ ] use https://ui.nuxt.com/llms.txt instead of custom logic finding section in llms-full.txt
- [ ] in the processing array list all features of each nuxt ui component and pick only the ones you want to implement
- [ ] add existing component to context so it can apply modifications (e.g. adding new features)
- [ ] track which features were implemented to guide AI when to add or remove a feature
- [ ] expand item configuration to include properties like output component name, in order to quick test isolated feature implementation (e.g. ButtonLoading.vue only implements loading but is based on ui-iconify/button)