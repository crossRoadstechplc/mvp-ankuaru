/** Dispatched after dispatch + receipt so processor workspace can refetch events. */
export const TRANSPORT_MUTATION_EVENT = 'ankuaru:transport-mutation'

export const dispatchTransportMutationEvent = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new Event(TRANSPORT_MUTATION_EVENT))
}
