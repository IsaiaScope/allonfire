"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconGripVertical,
  IconSortAscending2,
  IconTrash,
} from "@tabler/icons-react";
import type { SortingState } from "@tanstack/react-table";
import { cva } from "class-variance-authority";
import { type ReactNode, useCallback, useMemo } from "react";
import {
  AOFButton,
  type AOFButtonPartProps,
} from "../../../shared/components/aof-button";
import {
  AOFSelect,
  AOFSelectContent,
  AOFSelectItem,
  AOFSelectTrigger,
  AOFSelectValue,
} from "../../../shared/components/aof-select";
import { cn } from "../../../shared/utils/utils";
import {
  type AOFPanelColumn,
  addSort,
  canAddSort,
  removeSort,
  replaceSort,
  usableColumns,
} from "../utils/sort-rows";

/** A row's icon button: its own props, a `decoration` and its pictogram. */
type AOFSortIconButton = AOFButtonPartProps & { icon?: ReactNode };

export type AOFSortPanelProps = {
  /** The columns a list can sort by. */
  columns: readonly AOFPanelColumn[];
  labels: {
    add: string;
    asc: string;
    /** The column select's name. */
    column: string;
    desc: string;
    /** The direction select's name. */
    direction: string;
    /** The drag handle's name: it reorders the sorts (by keyboard: Space, arrows, Space). */
    drag: string;
    remove: string;
  };
  /** The most sorts a list takes. */
  max: number;
  /** The remove button's own props, a `decoration` drawn behind its pictogram
   *  (a brushed kanji) and its `icon` in place of the trash. */
  removeButton?: AOFSortIconButton | undefined;
  /** The drag handle's own props, `decoration` and `icon` likewise. */
  dragButton?: AOFSortIconButton | undefined;
  /** The Add sort button's own props, and a `decoration` drawn before its
   *  label (a kanji brushed in it). */
  addProps?: AOFButtonPartProps;
  onSortingChange: (next: SortingState) => void;
  sorting: SortingState;
};

type RowProps = Pick<
  AOFSortPanelProps,
  | "columns"
  | "dragButton"
  | "labels"
  | "onSortingChange"
  | "removeButton"
  | "sorting"
> & { index: number };

/**
 * A select's trigger as the other fields draw theirs (`AOFComboboxField`,
 * the Faceted lists): a field tall, text 16px, a 20px chevron, 12px sides.
 */
const trigger = cva(
  "px-3 text-base data-[size=default]:h-(--field-height) **:data-[slot=select-value]:min-w-0 **:data-[slot=select-value]:truncate md:text-base [&>svg]:size-5"
);

/** The options as big as a Faceted list's rows: a field tall, text 16px, icons 20px; the right side keeps room for the chosen one's check (8px in, 20px wide). */
const options = cva(
  "ring-input **:data-[slot=select-item]:min-h-(--field-height) **:data-[slot=select-item]:pr-9 **:data-[slot=select-item]:pl-3 **:data-[slot=select-item]:text-base [&_[data-slot=select-item]>div]:line-clamp-2 [&_[data-slot=select-item]>div]:min-w-0 [&_[data-slot=select-item]>div]:max-w-full [&_[data-slot=select-item]>div]:overflow-hidden [&_[data-slot=select-item]>div]:text-ellipsis [&_[data-slot=select-item]>div]:whitespace-normal [&_[data-slot=select-item]_svg:not([class*='size-'])]:size-5"
);
const MODIFIERS = [restrictToVerticalAxis, restrictToParentElement];
const ASC = "asc";
const DESC = "desc";

/**
 * One sort: its column, its direction, a remove button and the handle that
 * drags it (dnd-kit's sortable: a pointer drags, Space and the arrows move it
 * from the keyboard). Every control is as tall as a field.
 */
const SortRow = ({
  columns,
  dragButton,
  index,
  labels,
  onSortingChange,
  removeButton,
  sorting,
}: RowProps) => {
  const sort = sorting[index];
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: sort?.id ?? "" });
  const style = useMemo(
    () => ({ transform: CSS.Transform.toString(transform), transition }),
    [transform, transition]
  );
  const pickColumn = useCallback(
    (id: string | null) =>
      id === null
        ? undefined
        : onSortingChange(replaceSort(sorting, index, { id })),
    [index, onSortingChange, sorting]
  );
  const pickDirection = useCallback(
    (direction: string | null) =>
      onSortingChange(
        replaceSort(sorting, index, { desc: direction === DESC })
      ),
    [index, onSortingChange, sorting]
  );
  const remove = useCallback(
    () => onSortingChange(removeSort(sorting, index)),
    [index, onSortingChange, sorting]
  );
  if (!sort) {
    return null;
  }
  const usable = usableColumns(columns, sorting, index);
  const {
    decoration: removeDecoration,
    icon: removeIcon,
    ...removeProps
  } = removeButton ?? {};
  const {
    decoration: dragDecoration,
    icon: dragIcon,
    ...dragProps
  } = dragButton ?? {};
  return (
    <li
      className={
        isDragging
          ? "relative z-10 flex items-center gap-1.5 sm:gap-2"
          : "flex items-center gap-1.5 sm:gap-2"
      }
      ref={setNodeRef}
      style={style}
    >
      <AOFSelect
        items={usable.map(({ id, label }) => ({ label, value: id }))}
        onValueChange={pickColumn}
        value={sort.id}
      >
        <AOFSelectTrigger
          aria-label={labels.column}
          className={cn(trigger(), "min-w-0 flex-1")}
        >
          <AOFSelectValue />
        </AOFSelectTrigger>
        <AOFSelectContent className={options()}>
          {usable.map(({ id, label }) => (
            <AOFSelectItem key={id} value={id}>
              {label}
            </AOFSelectItem>
          ))}
        </AOFSelectContent>
      </AOFSelect>
      <AOFSelect
        items={[
          { label: labels.asc, value: ASC },
          { label: labels.desc, value: DESC },
        ]}
        onValueChange={pickDirection}
        value={sort.desc ? DESC : ASC}
      >
        <AOFSelectTrigger
          aria-label={labels.direction}
          className={cn(trigger(), "min-w-0 flex-1")}
        >
          <AOFSelectValue />
        </AOFSelectTrigger>
        <AOFSelectContent className={options()}>
          <AOFSelectItem value={ASC}>{labels.asc}</AOFSelectItem>
          <AOFSelectItem value={DESC}>{labels.desc}</AOFSelectItem>
        </AOFSelectContent>
      </AOFSelect>
      <AOFButton
        aria-label={labels.remove}
        size="icon-field"
        variant="outline"
        {...removeProps}
        onClick={remove}
      >
        {removeDecoration}
        {removeIcon ?? <IconTrash aria-hidden />}
      </AOFButton>
      <AOFButton
        aria-label={labels.drag}
        size="icon-field"
        variant="outline"
        {...dragProps}
        className={cn(
          "cursor-grab touch-none active:cursor-grabbing",
          dragProps.className
        )}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
      >
        {dragDecoration}
        {dragIcon ?? <IconGripVertical aria-hidden />}
      </AOFButton>
    </li>
  );
};

/**
 * A list's Sort tab, as tablecn's sort list draws it: a row for each sort
 * (its column, its direction, remove and a drag handle that reorders them),
 * and `Add sort`, which takes the first column not yet sorted, ascending
 * (left out at `max` or when none is left). A row's column select leaves out
 * the columns other rows use. Resetting the sorts is the Filter panel's
 * (`tabActions`).
 */
export const AOFSortPanel = ({
  addProps,
  columns,
  dragButton,
  labels,
  max,
  onSortingChange,
  removeButton,
  sorting,
}: AOFSortPanelProps) => {
  const { decoration, ...addButton } = addProps ?? {};
  const ids = columns.map(({ id }) => id);
  const sorted = sorting.map(({ id }) => id);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const add = useCallback(
    () => onSortingChange(addSort(sorting, ids, max)),
    [ids, max, onSortingChange, sorting]
  );
  const dropped = useCallback(
    ({ active, over }: DragEndEvent) => {
      const from = sorted.indexOf(String(active.id));
      const to = over ? sorted.indexOf(String(over.id)) : -1;
      if (from !== -1 && to !== -1 && from !== to) {
        onSortingChange(arrayMove(sorting, from, to));
      }
    },
    [onSortingChange, sorted, sorting]
  );
  return (
    <div className="flex flex-col gap-3">
      {sorting.length > 0 ? (
        <DndContext
          collisionDetection={closestCenter}
          modifiers={MODIFIERS}
          onDragEnd={dropped}
          sensors={sensors}
        >
          <SortableContext
            items={sorted}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-2">
              {sorting.map((sort, index) => (
                <SortRow
                  columns={columns}
                  dragButton={dragButton}
                  index={index}
                  key={sort.id}
                  labels={labels}
                  onSortingChange={onSortingChange}
                  removeButton={removeButton}
                  sorting={sorting}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
      {canAddSort(sorting, ids, max) ? (
        <div className="flex">
          <AOFButton
            size="field"
            variant="outline"
            {...addButton}
            onClick={add}
          >
            {decoration}
            <IconSortAscending2 aria-hidden />
            {labels.add}
          </AOFButton>
        </div>
      ) : null}
    </div>
  );
};
