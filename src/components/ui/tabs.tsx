"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
}>({
  value: "",
  onValueChange: () => {},
})

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = onValueChange || setInternalValue
  
  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ 
  value, 
  children, 
  className,
  ...props 
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext)
  const isActive = selectedValue === value
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-background text-foreground shadow-sm" 
          : "hover:bg-background/50 hover:text-foreground",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ 
  value, 
  children, 
  className,
  ...props 
}: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext)
  const isSelected = selectedValue === value
  
  if (!isSelected) return null
  
  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
} 