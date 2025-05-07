<script setup lang="ts">
import { ref, computed, useAttrs, type HTMLAttributes } from 'vue'
import UiIconifyButton from '../../ui-iconify/button/Button.vue'
import type { ButtonVariants } from '../../ui-iconify/button'
import { Icon } from '@iconify/vue'

export interface Props {
  label?: string;
  loading?: boolean;
  loadingAuto?: boolean;
  loadingIcon?: string;
  disabled?: boolean;
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  as?: string;
  asChild?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent) => Promise<any> | any;
}

const props = withDefaults(defineProps<Props>(), {
  loadingIcon: 'i-lucide-refresh-cw',
  type: 'button',
  disabled: false,
  loading: false,
  loadingAuto: false,
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const attrs = useAttrs();

const internalLoading = ref(false);

const isEffectivelyLoading = computed(() => props.loading || internalLoading.value);
const isDisabled = computed(() => props.disabled || isEffectivelyLoading.value);

const actualLoadingIconName = computed(() => {
  if (props.loadingIcon.startsWith('i-')) {
    return props.loadingIcon.substring(2);
  }
  return props.loadingIcon;
});

const handleButtonClick = async (event: MouseEvent) => {
  if (isDisabled.value) {
    event.preventDefault();
    return;
  }

  emit('click', event);

  if (props.onClick) {
    if (props.loadingAuto) {
      if (event.defaultPrevented) { 
        return;
      }
      internalLoading.value = true;
      try {
        const result = props.onClick(event);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        console.error('NuiButton: Error during loadingAuto onClick handler:', error);
      } finally {
        internalLoading.value = false;
      }
    } else {
      if (!event.defaultPrevented) {
        props.onClick(event);
      }
    }
  }
};

const uiIconifyButtonPassThroughProps = computed(() => {
  const result: Record<string, any> = {};
  if (props.variant !== undefined) result.variant = props.variant;
  if (props.size !== undefined) result.size = props.size;
  if (props.as !== undefined) result.as = props.as;
  if (props.asChild !== undefined) result.asChild = props.asChild;
  
  const filteredAttrs: Record<string, any> = {};
  for (const key in attrs) {
    // onClick is a prop, so it won't be in attrs if used as :onClick or v-on:click
    // Filter out class as it's handled separately
    if (key !== 'class') {
      filteredAttrs[key] = attrs[key];
    }
  }
  return { ...result, ...filteredAttrs };
});

const componentClass = computed(() => attrs.class as HTMLAttributes['class']);

</script>

<template>
  <UiIconifyButton
    v-bind="uiIconifyButtonPassThroughProps"
    :type="props.type"
    :disabled="isDisabled"
    :class="componentClass"
    @click="handleButtonClick"
  >
    <span v-if="isEffectivelyLoading" data-slot="loading-icon-wrapper" class="inline-flex items-center shrink-0">
      <Icon :icon="actualLoadingIconName" class="animate-spin" />
    </span>
    <slot>
      <span v-if="props.label" data-slot="label">{{ props.label }}</span>
    </slot>
  </UiIconifyButton>
</template>
