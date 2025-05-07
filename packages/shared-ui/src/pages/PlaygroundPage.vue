<template>
  <div class="container mx-auto p-4">
    <h1 class="mb-8 text-center text-3xl font-bold">Playground</h1>
    <div class="mx-auto flex max-w-3xl flex-col gap-6">
      <Card class="w-full rounded-lg border bg-card text-card-foreground">
        <CardHeader>
          <CardTitle class="text-xl font-semibold">Shadcn-vue Checkbox</CardTitle>
          <CardDescription> Default shadcn-vue checkbox component </CardDescription>
        </CardHeader>
        <CardContent>
          <Checkbox />
        </CardContent>
      </Card>

      <Card class="w-full rounded-lg border bg-card text-card-foreground">
        <CardHeader>
          <CardTitle class="text-xl font-semibold">Shadcn-vue-iconify Checkbox</CardTitle>
          <CardDescription> Uses iconify-vue Icon component instead of lucide-vue components </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckboxIconify />
        </CardContent>
      </Card>

      <Card class="w-full rounded-lg border bg-card text-card-foreground">
        <CardHeader>
          <CardTitle class="text-xl font-semibold">Shadcn-vue Button</CardTitle>
          <CardDescription> Default shadcn-vue button component has no loading props, you have to customize it yourself </CardDescription>
        </CardHeader>
        <CardContent class="flex justify-center">
          <Button>Click me</Button>
        </CardContent>
      </Card>

      <Card class="w-full rounded-lg border bg-card text-card-foreground">
        <CardHeader>
          <CardTitle class="text-xl font-semibold">Shadcn-vue Button (based on Nuxt UI)</CardTitle>
          <CardDescription> Implemented features from nuxt-ui: loading and loading-auto</CardDescription>
        </CardHeader>
        <CardContent class="flex justify-center">
          <Button2 loading-auto @click="handleClick">Click me</Button2>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { Checkbox as CheckboxIconify } from '@/components/ui-iconify/checkbox'
import { Button } from '@/components/ui/button'
import { Button as Button2 } from '@/components/nui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

async function handleClick() {
  console.log('handleClick')
  await new Promise((resolve) => setTimeout(resolve, 1000))
}
</script>
