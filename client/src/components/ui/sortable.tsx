// Adapted from https://shadcnstudio.com/docs/components/sortable
'use client'

import * as React from 'react'
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore
} from 'react'

import {
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DragStartEvent,
  DropAnimation,
  Modifiers,
  UniqueIdentifier,
  DraggableAttributes,
  DraggableSyntheticListeners
} from '@dnd-kit/core'
import type { AnimateLayoutChanges } from '@dnd-kit/sortable'
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

// Sortable Item Context
const SortableItemContext = createContext<{
  listeners: DraggableSyntheticListeners | undefined
  attributes?: DraggableAttributes
  setActivatorNodeRef?: (node: HTMLElement | null) => void
  isDragging?: boolean
  disabled?: boolean
}>({
  listeners: undefined,
  isDragging: false,
  disabled: false
})

const IsOverlayContext = createContext(false)

const SortableInternalContext = createContext<{
  activeId: UniqueIdentifier | null
  modifiers?: Modifiers
}>({
  activeId: null,
  modifiers: undefined
})

const animateLayoutChanges: AnimateLayoutChanges = args => defaultAnimateLayoutChanges({ ...args, wasDragging: true })

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4'
      }
    }
  })
}

// Multipurpose Sortable Component
export interface SortableRootProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'onDragStart' | 'onDragEnd'> {
  value: T[]
  onValueChange: (value: T[]) => void
  getItemValue: (item: T) => string
  children: ReactNode
  onMove?: (event: { event: DragEndEvent; activeIndex: number; overIndex: number }) => void
  strategy?: 'horizontal' | 'vertical' | 'grid'
  onDragStart?: (event: DragStartEvent) => void
  onDragEnd?: (event: DragEndEvent) => void
  modifiers?: Modifiers
}

function Sortable<T>({
  value,
  onValueChange,
  getItemValue,
  className,
  onMove,
  strategy = 'vertical',
  onDragStart,
  onDragEnd,
  modifiers,
  children,
  ...props
}: SortableRootProps<T>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id)
      onDragStart?.(event)
    },
    [onDragStart]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveId(null)
      onDragEnd?.(event)

      if (!over) return

      // Handle item reordering
      const activeIndex = value.findIndex((item: T) => getItemValue(item) === active.id)

      const overIndex = value.findIndex((item: T) => getItemValue(item) === over.id)

      if (activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex) {
        if (onMove) {
          onMove({ event, activeIndex, overIndex })
        } else {
          const newValue = arrayMove(value, activeIndex, overIndex)

          onValueChange(newValue)
        }
      }
    },
    [value, getItemValue, onValueChange, onMove, onDragEnd]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const getStrategy = () => {
    switch (strategy) {
      case 'horizontal':
        return rectSortingStrategy
      case 'grid':
        return rectSortingStrategy
      case 'vertical':
      default:
        return verticalListSortingStrategy
    }
  }

  const itemIds = useMemo(() => value.map(getItemValue), [value, getItemValue])

  const contextValue = useMemo(() => ({ activeId, modifiers }), [activeId, modifiers])

  // Find the active child for the overlay
  const overlayContent = useMemo(() => {
    if (!activeId) return null
    let result: ReactNode = null

    Children.forEach(children, child => {
      if (isValidElement<SortableItemProps>(child) && child.props.value === activeId) {
        result = cloneElement(child, {
          className: cn(child.props.className, 'z-50')
        })
      }
    })

    return result
  }, [activeId, children])

  return (
    <SortableInternalContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        modifiers={modifiers}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always
          }
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={getStrategy()}>
          <div
            data-slot='sortable'
            data-dragging={activeId !== null}
            className={cn(activeId !== null && 'cursor-grabbing!', className)}
            {...props}
          >
            {children}
          </div>
        </SortableContext>
        {mounted &&
          createPortal(
            <DragOverlay
              dropAnimation={dropAnimationConfig}
              modifiers={modifiers}
              className={cn('z-50', activeId && 'cursor-grabbing')}
            >
              <IsOverlayContext.Provider value={true}>{overlayContent}</IsOverlayContext.Provider>
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </SortableInternalContext.Provider>
  )
}

export interface SortableItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string
  disabled?: boolean
}

function SortableItem({ value, className, disabled, children, ...props }: SortableItemProps) {
  const isOverlay = useContext(IsOverlayContext)

  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging
  } = useSortable({
    id: value,
    disabled: disabled || isOverlay,
    animateLayoutChanges
  })

  if (isOverlay) {
    return (
      <SortableItemContext.Provider value={{ listeners: undefined, isDragging: true, disabled: true }}>
        <div inert aria-hidden='true' data-slot='sortable-item' data-value={value} data-dragging={true} className={cn(className)} {...props}>
          {children}
        </div>
      </SortableItemContext.Provider>
    )
  }

  const style = {
    transition,
    transform: CSS.Transform.toString(transform)
  } as CSSProperties

  return (
    <SortableItemContext.Provider value={{ listeners, attributes, setActivatorNodeRef, isDragging: isSortableDragging, disabled }}>
      <div
        data-slot='sortable-item'
        data-value={value}
        data-dragging={isSortableDragging}
        data-disabled={disabled}
        ref={setNodeRef}
        style={style}
        className={cn(isSortableDragging && 'z-50 opacity-50', disabled && 'opacity-50', className)}
        {...props}
      >
        {children}
      </div>
    </SortableItemContext.Provider>
  )
}

function SortableItemHandle({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { listeners, attributes, setActivatorNodeRef, isDragging, disabled } = useContext(SortableItemContext)

  return (
    <Button
      ref={setActivatorNodeRef}
      type='button'
      data-slot='sortable-item-handle'
      data-dragging={isDragging}
      data-disabled={disabled}
      {...attributes}
      {...listeners}
      className={cn('touch-none', isDragging ? 'cursor-grabbing!' : 'cursor-grab!', className)}
      {...props}
    />
  )
}

export interface SortableOverlayProps extends Omit<React.ComponentProps<typeof DragOverlay>, 'children'> {
  children?: ReactNode | ((params: { value: UniqueIdentifier }) => ReactNode)
}

function SortableOverlay({ children, className, ...props }: SortableOverlayProps) {
  const { activeId, modifiers } = useContext(SortableInternalContext)
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const content =
    activeId && children ? (typeof children === 'function' ? children({ value: activeId }) : children) : null

  if (!mounted) return null

  return createPortal(
    <DragOverlay
      dropAnimation={dropAnimationConfig}
      modifiers={modifiers}
      className={cn('z-50', activeId && 'cursor-grabbing', className)}
      {...props}
    >
      <IsOverlayContext.Provider value={true}>{content}</IsOverlayContext.Provider>
    </DragOverlay>,
    document.body
  )
}

export { Sortable, SortableItem, SortableItemHandle, SortableOverlay }
