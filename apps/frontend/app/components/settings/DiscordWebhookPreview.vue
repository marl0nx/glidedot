<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  pingUserId?: string
  avatarUrl?: string
  events?: string[]
}>()

const previewEvents = computed(() => {
  if (!props.events || props.events.length === 0) return ['Translation Approved']
  return props.events.slice(0, 2)
})
</script>

<template>
  <div class="bg-[#313338] text-[#dcddde] rounded-md p-4 font-sans text-sm w-full max-w-xl mx-auto border border-[#1e1f22]">
    <div class="flex items-start gap-4">
      <!-- Bot Avatar -->
      <div class="flex-shrink-0">
        <div class="w-10 h-10 rounded-full bg-[#2b2d31] flex items-center justify-center overflow-hidden">
          <img :src="avatarUrl || 'https://raw.githubusercontent.com/marl0nx/glide/main/apps/frontend/public/icon.png'" alt="Webhook Avatar" class="w-full h-full object-cover" :class="{ 'p-2': !avatarUrl }" />
        </div>
      </div>
      
      <!-- Message Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2 mb-1">
          <span class="font-medium text-white">glide.</span>
          <span class="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase leading-none mt-0.5">App</span>
          <span class="text-xs text-[#949ba4] ml-1">Today at 12:00 PM</span>
        </div>
        
        <div class="mb-1" v-if="pingUserId">
          <span class="bg-[#5865F2]/20 text-[#c9cdfb] px-1 rounded font-medium hover:bg-[#5865F2]/40 transition-colors cursor-pointer">@{{ pingUserId }}</span>
        </div>
        
        <!-- Embed -->
        <div class="bg-[#2b2d31] rounded flex overflow-hidden mt-2">
          <!-- Left color line -->
          <div class="w-1 bg-[#0284c7] flex-shrink-0"></div>
          
          <div class="p-3 flex-1">
            <h3 class="text-white font-bold text-base mb-1">
              {{ previewEvents[0] === 'translation.approved' ? 'Translation Approved' : (previewEvents[0] === 'quota.low' ? 'Low Quota Alert' : 'glide. Notification') }}
            </h3>
            
            <p class="text-[13px] text-[#dbdee1] mb-3">
              This is a preview of how notifications will appear in your Discord channel.
            </p>
            
            <!-- Fields -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
              <div>
                <div class="text-[11px] font-bold text-[#b5bac1] uppercase mb-1">Key</div>
                <div class="text-[13px] text-[#dbdee1]">homepage.hero.title</div>
              </div>
              <div>
                <div class="text-[11px] font-bold text-[#b5bac1] uppercase mb-1">Language</div>
                <div class="text-[13px] text-[#dbdee1]">German (de)</div>
              </div>
              <div class="col-span-2">
                <div class="text-[11px] font-bold text-[#b5bac1] uppercase mb-1">Action</div>
                <div class="text-[13px] text-[#dbdee1]">Approved by @reviewer</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center gap-2 mt-2">
              <img :src="avatarUrl || 'https://raw.githubusercontent.com/marl0nx/glide/main/apps/frontend/public/icon.png'" class="w-5 h-5 rounded-full object-cover" :class="{ 'p-0.5 bg-[#2b2d31]': !avatarUrl }" />
              <span class="text-[11px] text-[#dbdee1]">Powered by glide. • Today at 12:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
