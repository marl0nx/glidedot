<template>
  <div class="flex flex-col gap-8 max-w-6xl w-full">
    <!-- Header -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">API Documentation</h1>
        <p class="text-base text-neutral-500 dark:text-neutral-400 max-w-2xl">
          A comprehensive guide to all endpoints available in the glide. Backend. Use this documentation to seamlessly integrate with our platform.
        </p>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 relative mt-4">
      
      <!-- Sidebar Navigation -->
      <div class="lg:col-span-1">
        <u-card class="sticky top-24 shadow-xl rounded-xl max-h-[calc(100vh-8rem)] overflow-y-auto" :ui="{ body: { padding: 'p-3' } }">
          <div class="flex flex-col gap-4">
            <u-input v-model="searchQuery" icon="i-lucide-search" placeholder="Search endpoints..." size="sm" class="w-full" />
            
            <div class="flex flex-col gap-1">
              <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-wider px-3 py-1">Categories</h3>
              <nav class="flex flex-col gap-1">
              <a v-for="page in sortedPages" :key="page.path" :href="'#' + sanitize(page.title)" 
                 :class="[
                   'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                   activeSection === sanitize(page.title) 
                     ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' 
                     : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
                 ]">
                {{ page.title }}
              </a>
              </nav>
            </div>
          </div>
        </u-card>
      </div>

      <!-- Endpoints Details -->
      <div class="lg:col-span-3 flex flex-col gap-16">
        <div v-if="sortedPages.length === 0" class="flex flex-col items-center justify-center p-12 text-center border border-neutral-200 dark:border-neutral-800 border-dashed rounded-xl">
          <u-icon name="i-lucide-search-x" class="w-12 h-12 text-neutral-400 dark:text-neutral-600 mb-4" />
          <h3 class="text-lg font-medium text-neutral-700 dark:text-neutral-300">No matching endpoints found</h3>
          <p class="text-sm text-neutral-500 mt-1">Try a different search term or clear the search to see all endpoints.</p>
        </div>
      
        <div v-for="page in sortedPages" :id="sanitize(page.title)" :key="page.path" class="api-section scroll-mt-24 flex flex-col gap-4">
          <u-card class="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div class="prose dark:prose-invert prose-primary max-w-none p-4 md:p-8 prose-headings:text-neutral-900 dark:prose-headings:text-neutral-100 prose-h1:text-3xl prose-h2:text-xl prose-h2:font-semibold prose-h2:border-b prose-h2:border-neutral-200 dark:prose-h2:border-neutral-800 prose-h2:pb-3 prose-h2:mt-12 prose-h3:text-lg prose-h3:mt-8 prose-p:text-neutral-700 dark:prose-p:text-neutral-400 prose-li:text-neutral-700 dark:prose-li:text-neutral-400 prose-a:text-neutral-900 dark:prose-a:text-white prose-a:font-normal [&_a:hover]:text-neutral-600 dark:[&_a:hover]:text-neutral-300 prose-strong:text-neutral-900 dark:prose-strong:text-white prose-code:text-primary-800 dark:prose-code:text-primary-300 prose-code:bg-primary-100 dark:prose-code:bg-primary-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white dark:prose-pre:bg-[#0f0f11] prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800 prose-pre:mt-4 prose-hr:border-neutral-200 dark:prose-hr:border-neutral-800/60 prose-hr:my-10 prose-th:text-neutral-900 dark:prose-th:text-neutral-100 prose-td:text-neutral-700 dark:prose-td:text-neutral-400 prose-tr:border-neutral-200 dark:prose-tr:border-neutral-800 prose-blockquote:text-neutral-600 dark:prose-blockquote:text-neutral-400 prose-blockquote:border-l-primary-500">
              <content-renderer :value="page" />
            </div>
          </u-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAsyncData, computed, ref, onMounted, onUnmounted } from '#imports'

// Fetch all markdown pages in the content collection
const { data: pages } = await useAsyncData('api-pages', () => 
  queryCollection('content').all()
)

const searchQuery = ref('')

const sortedPages = computed(() => {
  if (!pages.value) return [];
  
  let result = [...pages.value].sort((a, b) => {
    const getNum = (page) => {
      const str = page.id || page.stem || page.path || '';
      const match = str.match(/(?:\/|^)(\d+)\./);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getNum(a) - getNum(b);
  });
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(page => {
      const titleMatch = page.title?.toLowerCase().includes(q)
      const bodyMatch = JSON.stringify(page.body || {}).toLowerCase().includes(q)
      return titleMatch || bodyMatch
    })
  }
  
  return result;
});

// Helper to sanitize IDs to match anchor links
const sanitize = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Track active section for sidebar highlighting
const activeSection = ref('');
let observer = null;

onMounted(() => {
  // Use a negative bottom margin so a section is considered active when it reaches the upper part of the screen
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id;
      }
    });
  }, { rootMargin: '-120px 0px -60% 0px' });

  // Observe all elements with the 'api-section' class
  document.querySelectorAll('.api-section').forEach((section) => {
    observer.observe(section);
  });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>
