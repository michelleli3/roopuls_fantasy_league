import { useState } from 'react';
import { useContestants, useAddContestant, useUpdateContestant } from '../../../hooks/useContestants';
import type { Contestant } from '../../../types';

export default function ContestantRoster() {
  const { data: contestants = [], isLoading } = useContestants();
  const addContestant = useAddContestant();
  const updateContestant = useUpdateContestant();

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function startEdit(c: Contestant) {
    setEditingId(c.id);
    setEditName(c.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await updateContestant.mutateAsync({ id, updates: { name: editName.trim() } });
    cancelEdit();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await addContestant.mutateAsync(newName.trim());
    setNewName('');
  }

  async function toggleActive(c: Contestant) {
    await updateContestant.mutateAsync({ id: c.id, updates: { active: !c.active } });
  }

  const active = contestants.filter(c => c.active);
  const eliminated = contestants.filter(c => !c.active);

  if (isLoading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="New contestant name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={addContestant.isPending}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ContestantTable
        title="Active"
        contestants={active}
        editingId={editingId}
        editName={editName}
        onEditNameChange={setEditName}
        onStartEdit={startEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        onToggleActive={toggleActive}
        saving={updateContestant.isPending}
      />

      {eliminated.length > 0 && (
        <ContestantTable
          title="Eliminated"
          contestants={eliminated}
          editingId={editingId}
          editName={editName}
          onEditNameChange={setEditName}
          onStartEdit={startEdit}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onToggleActive={toggleActive}
          saving={updateContestant.isPending}
        />
      )}
    </div>
  );
}

interface TableProps {
  title: string;
  contestants: Contestant[];
  editingId: string | null;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: (c: Contestant) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onToggleActive: (c: Contestant) => void;
  saving: boolean;
}

function ContestantTable({
  title, contestants, editingId, editName,
  onEditNameChange, onStartEdit, onSaveEdit, onCancelEdit,
  onToggleActive, saving,
}: TableProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contestants.map(c => (
              <tr key={c.id} className="bg-white">
                <td className="px-4 py-2">
                  {editingId === c.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => onEditNameChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onSaveEdit(c.id);
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      className="border rounded px-2 py-1 text-sm w-full"
                    />
                  ) : (
                    <span className={c.active ? '' : 'text-gray-400'}>{c.name}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                  {editingId === c.id ? (
                    <>
                      <button
                        onClick={() => onSaveEdit(c.id)}
                        disabled={saving}
                        className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onStartEdit(c)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onToggleActive(c)}
                        disabled={saving}
                        className={`text-xs font-medium ${c.active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {c.active ? 'Eliminate' : 'Reinstate'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
