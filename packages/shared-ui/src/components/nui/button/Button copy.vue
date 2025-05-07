<script setup lang="ts">
import { ref, computed, useSlots, useAttrs, type HTMLAttributes, type Component as VueComponent } from 'vue'
import UiIconifyButton from '../../ui-iconify/button/Button.vue'
import type { ButtonVariants } from '../../ui-iconify/button'
import { Icon } from '@iconify/vue'

// Define props based on Nuxt UI and UiIconifyButton
interface Props {
  label?: string
  loading?: boolean
  loadingAuto?: boolean
  loadingIcon?: string // Iconify icon name, e.g., 'lucide:refresh-cw'

  icon?: string // General icon, Iconify icon name
  leading?: boolean // If true, 'icon' prop is at the start. Default true if 'icon' present and not 'trailing'.
  trailing?: boolean // If true, 'icon' prop is at the end.
  leadingIcon?: string // Specific leading icon, Iconify icon name. Overrides 'icon' if 'leading'.
  trailingIcon?: string // Specific trailing icon, Iconify icon name. Overrides 'icon' if 'trailing'.

  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'

  // Link related props
  to?: string | object // URL or router path. If used, component may render as 'a' or custom link component.
  target?: string

  // Props from UiIconifyButton / Primitive
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  as?: string | VueComponent // Element or component to render as
  asChild?: boolean
  class?: HTMLAttributes['class'] // Class for the root element
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  loadingIcon: 'lucide:refresh-cw',
  leading: undefined, // Auto-determine based on icon presence and other props
  trailing: false,
  as: 'button',
  disabled: false,
  loading: false,
  loadingAuto: false,
})

const slots = useSlots()
const attrs = useAttrs()

const internalLoading = ref(false)

const isLoading = computed(() => props.loading || internalLoading.value)
const effectiveDisabled = computed(() => props.disabled || isLoading.value)

const hasLabel = computed(() => !!(props.label || slots.default))

// Determine icon names to display
const displayLeadingIconName = computed(() => {
  if (isLoading.value) {
    // If loading, and the effective position for the icon is leading (not explicitly trailing)
    return !props.trailing ? props.loadingIcon : undefined
  }
  // If leadingIcon is provided, it takes precedence
  if (props.leadingIcon) return props.leadingIcon
  // Otherwise, use general 'icon' if 'leading' is true or default (and not overridden by trailingIcon for the slot)
  if (props.icon && (props.leading === true || (props.leading === undefined && !props.trailing && !props.trailingIcon))) {
    return props.icon
  }
  return undefined
})

const displayTrailingIconName = computed(() => {
  if (isLoading.value) {
    // If loading, and the effective position for the icon is trailing
    return props.trailing ? props.loadingIcon : undefined
  }
  // If trailingIcon is provided, it takes precedence
  if (props.trailingIcon) return props.trailingIcon
  
  // Determine if props.icon is already effectively used as a leading icon
  const iconIsEffectivelyLeading = props.icon && 
                                 !props.leadingIcon && 
                                 (props.leading === true || (props.leading === undefined && !props.trailing && !props.trailingIcon));
  
  // Use general 'icon' if 'trailing' is true and it's not already used as leading
  if (props.icon && props.trailing === true && !iconIsEffectivelyLeading) {
    return props.icon
  }
  return undefined
})

// Handle click for loadingAuto behavior
async function handleClick(event: MouseEvent) {
  if (effectiveDisabled.value) {
    event.preventDefault()
    return
  }

  const userOnClick = attrs.onClick as ((evt: MouseEvent) => Promise<any> | any) | undefined

  if (props.loadingAuto && typeof userOnClick === 'function') {
    internalLoading.value = true
    try {
      await Promise.resolve(userOnClick(event))
    } catch (error) {
      console.error("Error during loading-auto click operation:", error)
      throw error; // Re-throw to allow parent error handling, finally will still run
    } finally {
      internalLoading.value = false
    }
  } else if (typeof userOnClick === 'function') {
    userOnClick(event)
  }
  // If no userOnClick, UiIconifyButton handles native button behavior (e.g., submit)
}

// Determine the component to render as ('as' prop for UiIconifyButton)
const finalAs = computed(() => {
  if (props.to && props.as === 'button') { // If 'to' is present and 'as' is default, assume 'a' tag
    return 'a'
  }
  return props.as
})

// Attributes to pass to UiIconifyButton, filtering out handled ones like onClick
const componentAttrs = computed(() => {
  const { onClick, class: _attrClass, ...restOfUserAttrs } = attrs // _attrClass is handled by :class binding below
  
  let linkSpecificAttrs: Record<string, any> = {}
  if (props.to) {
    if (finalAs.value === 'a') {
      linkSpecificAttrs.href = typeof props.to === 'string' ? props.to : undefined
      if (props.target) linkSpecificAttrs.target = props.target
      if (props.target === '_blank' && !linkSpecificAttrs.rel) linkSpecificAttrs.rel = 'noopener noreferrer'
    } else {
      // For custom components like RouterLink, pass 'to' and 'target' directly
      linkSpecificAttrs.to = props.to
      if (props.target) linkSpecificAttrs.target = props.target
    }
  }

  return {
    ...restOfUserAttrs,
    ...linkSpecificAttrs,
    type: props.to ? undefined : props.type, // 'type' is not for links
  }
})

</script>

<template>
  <UiIconifyButton
    :variant="props.variant"
    :size="props.size"
    :as="finalAs"
    :as-child="props.asChild"
    :class="[props.class, attrs.class]" 
    :disabled="effectiveDisabled"
    :aria-disabled="effectiveDisabled ? 'true' : undefined"
    v-bind="componentAttrs"
    @click="handleClick"
  >
    <slot name="leading">
      <Icon
        v-if="displayLeadingIconName"
        :icon="displayLeadingIconName"
        :class="{ 'animate-spin': isLoading && displayLeadingIconName === props.loadingIcon }"
        data-slot="leading-icon"
      />
    </slot>

    <span v-if="hasLabel" data-slot="label">
      <slot>{{ props.label }}</slot>
    </span>
    <!-- Icon-only content (not loading) -->
    <template v-else-if="!isLoading && props.icon && !displayLeadingIconName && !displayTrailingIconName">
        <slot name="icon-only-fallback">
            <Icon :icon="props.icon" data-slot="icon-only" />
        </slot>
    </template>
    <!-- Icon-only content (loading) -->
    <template v-else-if="!hasLabel && isLoading && !displayLeadingIconName && !displayTrailingIconName">
         <slot name="icon-only-loading-fallback">
            <Icon :icon="props.loadingIcon" class="animate-spin" data-slot="loading-icon-only" />
        </slot>
    </template>

    <slot name="trailing">
      <Icon
        v-if="displayTrailingIconName"
        :icon="displayTrailingIconName"
        :class="{ 'animate-spin': isLoading && displayTrailingIconName === props.loadingIcon }"
        data-slot="trailing-icon"
      />
    </slot>
  </UiIconifyButton>
</template>
