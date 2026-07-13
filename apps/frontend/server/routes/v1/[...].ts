import { joinURL } from 'ufo'

export default defineEventHandler(async (event) => {
  const apiUrl = useRuntimeConfig().apiUrl as string

  const target = joinURL(apiUrl, event.path)

  return proxyRequest(event, target)
})
