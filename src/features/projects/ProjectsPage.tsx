import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ChevronRight, Pencil, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchField, SelectField, StatusBadge, TextAreaField } from '../../components/ui'
import { friendlyError, shortDate } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { projectsApi } from '../../services/api'
import type { Project } from '../../types/domain'

type ProjectFilter = 'all' | 'residential' | 'commercial'

const projectFilters: Array<{ value: ProjectFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
]

export function ProjectsPage() {
  const { has } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const query = useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ProjectFilter>('all')
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const mutation = useMutation({ mutationFn: ({ values, id }: { values: any; id?: string }) => projectsApi.save(values, id), onSuccess: () => { setEditing(null); void client.invalidateQueries({ queryKey: queryKeys.projects }); void client.invalidateQueries({ queryKey: queryKeys.dashboard }) } })
  const filtered = useMemo(() => (query.data ?? []).filter((project) => {
    const matchesCategory = category === 'all' || project.category.toLowerCase() === category
    const matchesSearch = [project.name, project.code, project.location, project.category].some((value) => value?.toLowerCase().includes(search.toLowerCase()))
    return matchesCategory && matchesSearch
  }), [category, query.data, search])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    if (mutation.isPending) return
    mutation.mutate({ values: { code: String(data.get('code') || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), name: String(data.get('name') || '').trim(), category: data.get('category'), location: String(data.get('location') || '').trim() || null, description: String(data.get('description') || '').trim() || null, is_active: data.get('is_active') === 'true' }, id: editing === 'new' ? undefined : editing?.id })
  }
  return <>
    <PageHeader title="Our Projects" description="Residential and commercial portfolio management." actions={has('projects.create') ? <Button onClick={() => setEditing('new')}><Plus size={17} /> Add project</Button> : undefined} />
    <div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search project, location or category" /></div>
    <div className="project-filters" role="group" aria-label="Filter projects by category">{projectFilters.map((filter) => <button type="button" key={filter.value} className={`project-filter ${category === filter.value ? 'project-filter--active' : ''}`} aria-pressed={category === filter.value} onClick={() => setCategory(filter.value)}>{filter.label}</button>)}</div>
    {query.error && query.data && <ErrorState message="Refresh failed. Showing the last loaded projects." onRetry={() => query.refetch()} />}
    {query.isLoading ? <LoadingState /> : query.error && !query.data ? <ErrorState message={friendlyError(query.error)} onRetry={() => query.refetch()} /> : filtered.length === 0 ? <EmptyState title="No projects found" detail="Add the first project or adjust the search or category filter." /> : <section className="project-grid">{filtered.map((project) => <article className="project-card project-card--interactive" key={project.id} onClick={() => navigate(`/projects/${project.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(`/projects/${project.id}`) }} role="link" tabIndex={0}><div className={`project-card__visual project-card__visual--${project.category}`}><span>{project.category}</span></div><div className="project-card__body"><div><h2>{project.name}</h2><p>{project.location || 'Location not set'} · {project.code}</p></div><StatusBadge value={project.is_active} /><p>{project.description || 'No project description.'}</p><small>Updated {shortDate(project.updated_at)}</small><div className="project-card__actions">{has('projects.update') && <Button variant="secondary" onClick={(event) => { event.stopPropagation(); setEditing(project) }}><Pencil size={16} /> Edit</Button>}{has('projects.archive') && project.is_active && <Button variant="ghost" aria-label={`Archive ${project.name}`} onClick={(event) => { event.stopPropagation(); void projectsApi.archive(project.id).then(() => query.refetch()) }}><Archive size={16} /></Button>}<Button variant="ghost" className="project-open" aria-label={`Open ${project.name}`} onClick={(event) => { event.stopPropagation(); navigate(`/projects/${project.id}`) }}><ChevronRight /></Button></div></div></article>)}</section>}
    {mutation.error && <div className="toast toast--error">{friendlyError(mutation.error)}</div>}
    {editing && <Modal title={editing === 'new' ? 'Add project' : 'Edit project'} onClose={() => setEditing(null)}><form className="modal-form" onSubmit={submit}><div className="form-grid"><Field name="name" label="Project name" defaultValue={editing === 'new' ? '' : editing.name} maxLength={120} required /><Field name="code" label="Project code" defaultValue={editing === 'new' ? '' : editing.code} pattern="[A-Za-z0-9 _-]+" maxLength={40} required /><SelectField name="category" label="Category" defaultValue={editing === 'new' ? 'residential' : editing.category}><option value="residential">Residential</option><option value="commercial">Commercial</option></SelectField><Field name="location" label="Location" defaultValue={editing === 'new' ? '' : editing.location ?? ''} maxLength={200} /><SelectField name="is_active" label="Status" defaultValue={editing === 'new' || editing.is_active ? 'true' : 'false'}><option value="true">Active</option><option value="false">Archived</option></SelectField><TextAreaField name="description" label="Description" defaultValue={editing === 'new' ? '' : editing.description ?? ''} maxLength={1000} /></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={mutation.isPending}>Save project</Button></div></form></Modal>}
  </>
}
