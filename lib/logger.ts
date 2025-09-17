const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  info: (...args: any[]) => {
    console.log(...args)
  },
  warn: (...args: any[]) => {
    console.warn(...args)
  },
  error: (...args: any[]) => {
    console.error(...args)
  }
} 