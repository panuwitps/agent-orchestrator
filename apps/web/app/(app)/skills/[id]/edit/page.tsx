import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getSkillForOwner } from '@ao/db'
import { FormField, TextArea } from '@/components/form-field'
import { ConfirmDeleteButton } from '@/components/confirm-dialog'
import { updateSkillAction, deleteSkillAction } from '../../actions'

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const skill = await getSkillForOwner(session.user.id, id)
  if (!skill) notFound()

  async function save(formData: FormData) {
    'use server'
    const res = await updateSkillAction(null, id, {
      name: formData.get('name'),
      description: formData.get('description'),
      content: formData.get('content'),
      frontmatter: tryJson(formData.get('frontmatter')),
      compatibleProviders: parseCsv(formData.get('compatibleProviders')),
    })
    if (res.ok) redirect('/skills')
  }
  async function remove() {
    'use server'
    await deleteSkillAction(null, id)
    redirect('/skills')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">Edit skill</h1>
      <form action={save} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required defaultValue={skill.name} />
        <FormField label="Description" name="description" required defaultValue={skill.description} />
        <FormField
          label="Compatible providers (comma separated)"
          name="compatibleProviders"
          defaultValue={skill.compatibleProviders.join(', ')}
        />
        <FormField
          label="Frontmatter (JSON object)"
          name="frontmatter"
          defaultValue={JSON.stringify(skill.frontmatter, null, 2)}
        />
        <TextArea label="Content (Markdown)" name="content" required rows={16} defaultValue={skill.content} />
        <div className="flex items-center justify-between">
          <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">
            Save
          </button>
          <ConfirmDeleteButton action={remove} />
        </div>
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
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}
