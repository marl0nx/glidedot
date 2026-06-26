import { ref } from 'vue'

export type ShortcutConfig = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export type ShortcutMap = {
  saveNext: ShortcutConfig
  next: ShortcutConfig
  prev: ShortcutConfig
  close: ShortcutConfig
  approve: ShortcutConfig
  copySource: ShortcutConfig
}

const defaultShortcuts: ShortcutMap = {
  saveNext: { key: 'Enter', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
  next: { key: 'ArrowRight', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
  prev: { key: 'ArrowLeft', metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
  close: { key: 'Escape', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false },
  approve: { key: 'Tab', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false },
  copySource: { key: 'c', metaKey: true, ctrlKey: false, shiftKey: true, altKey: false }
}

const shortcuts = ref<ShortcutMap>(JSON.parse(JSON.stringify(defaultShortcuts)))

export function useShortcuts() {
  const loadShortcuts = () => {
    const saved = localStorage.getItem('glide_shortcuts')
    if (saved) {
      try {
        shortcuts.value = { ...defaultShortcuts, ...JSON.parse(saved) }
      } catch { /* ignore */ }
    }
  }

  const saveShortcuts = () => {
    localStorage.setItem('glide_shortcuts', JSON.stringify(shortcuts.value))
  }

  const matchShortcut = (e: KeyboardEvent, shortcutName: keyof ShortcutMap): boolean => {
    const sc = shortcuts.value[shortcutName]
    if (!sc) return false
    return e.key.toLowerCase() === sc.key.toLowerCase() &&
           e.metaKey === sc.metaKey &&
           e.ctrlKey === sc.ctrlKey &&
           e.shiftKey === sc.shiftKey &&
           e.altKey === sc.altKey
  }

  const formatShortcut = (sc: ShortcutConfig): string[] => {
    const keys = []
    if (sc.metaKey) keys.push('⌘')
    if (sc.ctrlKey) keys.push('Ctrl')
    if (sc.altKey) keys.push('⌥')
    if (sc.shiftKey) keys.push('⇧')
    
    let k = sc.key
    if (k === 'ArrowRight') k = '→'
    else if (k === 'ArrowLeft') k = '←'
    else if (k === 'ArrowUp') k = '↑'
    else if (k === 'ArrowDown') k = '↓'
    else if (k === ' ') k = 'Space'
    else if (k.length === 1) k = k.toUpperCase()
    
    keys.push(k)
    return keys
  }

  return {
    shortcuts,
    loadShortcuts,
    saveShortcuts,
    matchShortcut,
    formatShortcut,
    defaultShortcuts
  }
}
