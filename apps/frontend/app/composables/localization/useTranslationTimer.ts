import { ref, onUnmounted } from 'vue'

export function useTranslationTimer() {
  const timeSpentMs = ref(0)
  const isTracking = ref(false)
  const hasStartedTyping = ref(false)
  
  let timerInterval: any = null
  let idleTimeout: any = null
  let lastActiveTime = Date.now()
  let lastTickTime = Date.now()

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
    lastTickTime = Date.now()
    
    timerInterval = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickTime
      lastTickTime = now
      
      // Only add time if we are not idle and the user has started typing
      if (hasStartedTyping.value && now - lastActiveTime < IDLE_THRESHOLD_MS) {
        timeSpentMs.value += delta
        // Enforce max cap
        if (timeSpentMs.value > MAX_TIME_MS) {
            timeSpentMs.value = MAX_TIME_MS
        }
      }
    }, 100) // Run every 100ms for responsiveness and high precision
    
    startIdleDetection()
  }

  const stopTracking = () => {
    if (!isTracking.value) return
    isTracking.value = false
    
    // Perform one final tick calculation to capture exact milliseconds up to the moment of save
    const now = Date.now()
    const delta = now - lastTickTime
    if (hasStartedTyping.value && now - lastActiveTime < IDLE_THRESHOLD_MS) {
      timeSpentMs.value += delta
      if (timeSpentMs.value > MAX_TIME_MS) {
        timeSpentMs.value = MAX_TIME_MS
      }
    }
    
    clearTimeouts()
  }

  const registerActivity = () => {
    if (!isTracking.value) return
    if (!hasStartedTyping.value) {
      hasStartedTyping.value = true
      lastTickTime = Date.now() // Start delta calculation from the exact moment they typed
    }
    lastActiveTime = Date.now()
    startIdleDetection()
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
