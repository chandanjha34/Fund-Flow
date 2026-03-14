import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(duration: string): string {
  // Handle legacy formats and ensure proper formatting
  const durationMap: Record<string, string> = {
    '3months': '3 Months',
    '6months': '6 Months', 
    '1year': '1 Year',
    '3years': '3 Years',
    '3 Months': '3 Months',
    '6 Months': '6 Months',
    '1 Year': '1 Year',
    '3 Years': '3 Years'
  }
  
  return durationMap[duration] || duration
}
