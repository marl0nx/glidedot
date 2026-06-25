import { ref, watch, onUnmounted } from 'vue'

export function useTranslationTimer() {
  const timeSpentMs = ref(0)
  const isTracking = ref(false)
  const hasStartedTyping = ref(false)
  
  let timerInterval: any = null
  let idleTimeout: any = null
  let lastActiveTime = Date.now()

  const IDLE_THRESHOLD_MS = 10000 // 10 seconds of inactivity pauses the timer
  const MAX_TIME_MS = 120000 // Cap at 2 minutes per save

  const resetTimer = () => {
    timeSpentMs.value = 0
    isTracking.value = false
    hasStartedTyping.value = false
    clearTimeouts()
  }

  const clearTimeouts = () => {
    if (timerInterval) clearInterval(timerInterval)
    if (idleTimeout) clearTimeout(idleTimeout)
    timerInterval = null
    idleTimeout = null
  }

  const startTracking = () => {
    if (isTracking.value) return
    isTracking.value = true
    hasStartedTyping.value = false
    lastActiveTime = Date.now()
    
    timerInterval = setInterval(() => {
      const now = Date.now()
      // Only add time if we are not idle and the user has started typing
      if (hasStartedTyping.value && now - lastActiveTime < IDLE_THRESHOLD_MS) {
        timeSpentMs.value += 1000
        // Enforce max cap
        if (timeSpentMs.value > MAX_TIME_MS) {
            timeSpentMs.value = MAX_TIME_MS
        }
      }
    }, 1000)
    
    startIdleDetection()
  }

  const stopTracking = () => {
    isTracking.value = false
    clearTimeouts()
  }

  const registerActivity = () => {
    if (!isTracking.value) return
    if (!hasStartedTyping.value) hasStartedTyping.value = true
    lastActiveTime = Date.now()
  }

  const startIdleDetection = () => {
    if (idleTimeout) clearTimeout(idleTimeout)
    idleTimeout = setTimeout(() => {
        // We've been idle for IDLE_THRESHOLD_MS. The interval above will naturally stop adding time.
    }, IDLE_THRESHOLD_MS)
  }

  onUnmounted(() => {
    clearTimeouts()
  })

  return {
    timeSpentMs,
    startTracking,
    stopTracking,
    registerActivity,
    resetTimer
  }
}
