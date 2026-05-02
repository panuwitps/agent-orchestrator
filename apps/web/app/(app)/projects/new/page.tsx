import { redirect } from 'next/navigation'
import { FormField, TextArea } from '@/components/form-field'
import { createProjectAction } from '../actions'

export default function NewProjectPage() {
  async function submit(formData: FormData) {
    'use server'
    const res = await createProjectAction(null, {
      name: formData.get('name'),
      description: formData.get('description'),
    })
    if (res.ok) redirect('/projects')
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">New project</h1>
      <form action={submit} className="mt-6 space-y-4">
        <FormField label="Name" name="name" required placeholder="Customer Support Bot" />
        <TextArea label="Description" name="description" rows={4} required />
        <button className="rounded bg-emerald-600 px-3 py-2 font-medium hover:bg-emerald-500">Create</button>
      </form>
    </main>
  )
}
