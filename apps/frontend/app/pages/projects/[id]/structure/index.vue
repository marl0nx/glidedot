<script setup lang="ts">
import KeysSettings from '~/components/localization/structure/KeysSettings.vue'
import LanguagesSettings from '~/components/localization/structure/LanguagesSettings.vue'
import LabelsSettings from '~/components/localization/structure/LabelsSettings.vue'

const items = [{
  label: 'Translation Keys',
  icon: 'i-lucide-logs',
  slot: 'keys'
}, {
  label: 'Labels',
  icon: 'i-lucide-tag',
  slot: 'labels'
}, {
  label: 'Languages',
  icon: 'i-lucide-flag',
  slot: 'languages'
}]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-layers" class="w-5 h-5 text-primary-500" />
            Structure
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Manage the core architecture of your translations.</p>
      </div>
    </div>
    
    <u-tabs 
      :items="items" 
      :default-index="0" 
      class="mt-4 w-full"
      :ui="{ list: 'bg-neutral-900 border border-neutral-800 w-full h-10', trigger: 'h-8 text-sm' }"
    >
      <template #keys="{ item }">
        <div class="py-2 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-logs" class="w-5 h-5 text-primary-500" />
                Translation Keys
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Manage and organize the unique identifiers for your translations.</p>
            </div>
          </div>
          <keys-settings />
        </div>
      </template>
      <template #labels="{ item }">
        <div class="py-2 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-tag" class="w-5 h-5 text-primary-500" />
                Labels
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Create and manage labels to group and filter your translation keys.</p>
            </div>
          </div>
          <labels-settings />
        </div>
      </template>
      <template #languages="{ item }">
        <div class="py-2 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                <u-icon name="i-lucide-flag" class="w-5 h-5 text-primary-500" />
                Languages
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Configure target languages and their respective ISO codes.</p>
            </div>
          </div>
          <languages-settings />
        </div>
      </template>
    </u-tabs>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
