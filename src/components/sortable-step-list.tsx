"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useId } from "react";

interface SortableStepListProps {
  steps: string[];
  onChange: (steps: string[]) => void;
}

function SortableStep({
  id,
  index,
  value,
  onChangeText,
  onRemove,
}: {
  id: string;
  index: number;
  value: string;
  onChangeText: (value: string) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="mt-2.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="mt-2.5 text-sm font-medium text-muted-foreground w-6 text-right shrink-0">
        {index + 1}.
      </span>
      <textarea
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="Describe this step..."
        rows={2}
        className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 p-2 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SortableStepList({ steps, onChange }: SortableStepListProps) {
  const prefix = useId();
  const ids = steps.map((_, i) => `${prefix}-step-${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      onChange(arrayMove(steps, oldIndex, newIndex));
    }
  }

  function updateStep(index: number, value: string) {
    const updated = [...steps];
    updated[index] = value;
    onChange(updated);
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function addStep() {
    onChange([...steps, ""]);
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Instructions</h2>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add Step
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {steps.map((step, i) => (
            <SortableStep
              key={ids[i]}
              id={ids[i]}
              index={i}
              value={step}
              onChangeText={(v) => updateStep(i, v)}
              onRemove={() => removeStep(i)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
