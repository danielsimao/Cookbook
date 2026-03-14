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
        className="mt-2.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground opacity-50"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="step-circle mt-1">
        {index + 1}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="Describe this step..."
        rows={2}
        className="input-cookbook flex-1 resize-none"
      />
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 p-2 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
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
    <div className="paper-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="section-header">Steps</h2>
        <button
          type="button"
          onClick={addStep}
          className="font-hand text-base text-primary hover:underline inline-flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
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
