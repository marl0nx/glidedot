<script setup lang="ts">
defineProps<{
  hasUnsavedChanges: boolean
  loading?: boolean
  hideButtons?: boolean
}>()

const emit = defineEmits<{
  (e: 'save' | 'discard'): void
}>()
</script>

<template>
  <Teleport to="body">
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform translate-y-full opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-full opacity-0"
    >
      <div v-if="hasUnsavedChanges" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
        <div
          class="bg-neutral-900/95 backdrop-blur-lg border border-neutral-800 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-3 flex items-center justify-between pointer-events-auto ring-1 ring-white/10"
          @click.stop
          @mousedown.stop
          @mouseup.stop
          @pointerdown.stop
          @pointerup.stop
        >
          <div class="flex items-center gap-3 pl-1">
            <div class="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
              <u-icon name="i-lucide-alert-circle" class="w-4 h-4 text-primary-500" />
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-semibold text-white">Unsaved changes</span>
              <span class="text-xs text-neutral-400">Do you want to save them?</span>
            </div>
          </div>
          <div v-if="!hideButtons" class="flex items-center gap-2">
            <u-button
              color="neutral"
              variant="ghost"
              size="sm"
              label="Discard"
              :disabled="loading"
              @click="emit('discard')"
            />
            <u-button
              color="primary"
              size="sm"
              label="Save"
              :loading="loading"
              @click="emit('save')"
            />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
