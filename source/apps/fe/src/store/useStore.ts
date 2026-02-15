import { create } from 'zustand'

interface State {
  count: number
  increase: (by: number) => void
}

const useStore = create<State>((set) => ({
  count: 1,
  increase: (by) => set((state) => ({ count: state.count + by })),
}))

export default useStore
