import { redirect } from 'next/navigation'
import { FormField, TextArea } from '@/components/form-field'
import { createSkillAction } from '../actions'

export default function NewSkillPage() {
  async function submit(formData: FormData) {
    'use server'
    const res = await createSkillAction(null, {
      name: formData.get('name'),
      description: formData.get('description'),
      content: formData.get('content'),
      frontmatter: tryJson(formData.get('frontmatter')),
      compatibleProviders: parseCsv(formData.get('compatibleProviders')),
    })
    if (res.ok) redirect('/skills')
  }
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New skill</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="test-driven-development" />
        <FormField label="Description" name="description" required />
        <FormField
          label="Compatible providers (comma separated)"
          name="compatibleProviders"
          placeholder="claude, codex, gemini"
        />
        <FormField
          label="Frontmatter (JSON object)"
          name="frontmatter"
          placeholder='{"trigger": "tests"}'
          hint="Optional. Stored as-is on the skill."
        />
        <TextArea label="Content (Markdown)" name="content" required rows={16} />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
          Create
        </button>
      </form>
    </main>
  )
}

function tryJson(v: FormDataEntryValue | null): Record<string, unknown> {
  if (typeof v !== 'string' || v.trim() === '') return {}
  try {
    const parsed = JSON.parse(v)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseCsv(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
