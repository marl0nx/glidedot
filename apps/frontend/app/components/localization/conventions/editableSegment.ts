import type { KeyTemplateSegment } from '~/types'

export type EditableSegment = KeyTemplateSegment & { _id: string }

export const toEditableSegment = (segment: KeyTemplateSegment): EditableSegment => ({
  ...segment,
  _id: crypto.randomUUID()
})

export const stripEditableId = (segment: EditableSegment): KeyTemplateSegment => {
  const { _id, ...rest } = segment
  return rest
}
