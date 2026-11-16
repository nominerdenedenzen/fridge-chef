'use client';

import { useState } from 'react';
import { Button } from './ui/button';

type Props = {
  items: { name: string; checked: boolean }[];
  onChange: (items: { name: string; checked: boolean }[]) => void;
};

/** Checkboxes for what the AI found, plus a box to add anything it missed. */
export function IngredientList({ items, onChange }: Props) {
  const [draft, setDraft] = useState('');

  function add() {
    const names = draft
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((n) => !items.some((i) => i.name === n));
    if (names.length) onChange([...items, ...names.map((name) => ({ name, checked: true }))]);
    setDraft('');
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted">No ingredients yet. Type them below.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li key={item.name}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  item.checked ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-white text-muted line-through'
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-[var(--color-brand)]"
                  checked={item.checked}
                  onChange={() =>
                    onChange(items.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))
                  }
                />
                {item.name}
              </label>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add ingredients, e.g. rice, garlic"
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <Button type="submit" variant="outline">
          Add
        </Button>
      </form>
    </div>
  );
}
