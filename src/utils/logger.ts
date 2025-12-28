// Generic user-friendly error messages (don't expose internal details)
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  network: 'Error de conexión. Verifica tu internet.',
  validation: 'Los datos ingresados no son válidos.',
  notfound: 'El recurso solicitado no existe.',
  unauthorized: 'No tienes permisos para esta acción.',
  default: 'Ocurrió un error. Intenta nuevamente.',
}

// Classify error type for user-friendly messaging
function classifyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
      return 'network'
    }
    if (msg.includes('validation') || msg.includes('invalid')) {
      return 'validation'
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return 'notfound'
    }
    if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
      return 'unauthorized'
    }
  }
  return 'default'
}

/**
 * Error helper that logs internally but returns a safe user-friendly message.
 * Use this in catch blocks to handle errors consistently.
 */
export function handleError(error: unknown, context: string): string {
  // Log the full error internally for debugging (only visible in console)
  const internalMessage = error instanceof Error ? error.message : 'Error desconocido'
  console.error(`[${context}]`, internalMessage, error)

  // Return a safe, user-friendly message (no internal details exposed)
  const errorType = classifyError(error)
  return USER_FRIENDLY_MESSAGES[errorType]
}
