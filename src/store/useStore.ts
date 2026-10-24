// 앱 상태(기기에만 저장). AsyncStorage에 영구 저장된다.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { dateKey } from '@/lib/time';
import type { ExerciseLog, Place, PlaceEquipment, Profile, Settings, WeightEntry, WorkoutLog } from '@/types/models';

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface State {
  profile: Profile | null;
  places: Place[];
  workouts: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  weights: WeightEntry[];
  /** 날짜별 마신 물(ml) */
  water: Record<string, number>;
  /** 날짜별 식단 "다시 짜기" 횟수 */
  mealShuffle: Record<string, number>;
  settings: Settings;
  lastPlaceId: string | null;

  saveProfile: (p: Profile) => void;
  addWeight: (weightKg: number, date?: string) => void;
  removeWeight: (date: string) => void;

  addPlace: (place: Omit<Place, 'id' | 'createdAt'>) => string;
  updatePlace: (id: string, patch: Partial<Omit<Place, 'id'>>) => void;
  removePlace: (id: string) => void;
  setPlaceEquipment: (placeId: string, items: PlaceEquipment[]) => void;
  upsertPlaceEquipment: (placeId: string, item: PlaceEquipment) => void;
  removePlaceEquipment: (placeId: string, equipmentId: string) => void;

  startWorkout: (w: Omit<WorkoutLog, 'id' | 'startedAt' | 'date'>) => void;
  updateActiveExercises: (exercises: ExerciseLog[]) => void;
  finishWorkout: () => void;
  discardWorkout: () => void;
  removeWorkout: (id: string) => void;

  addWater: (ml: number, date?: string) => void;
  shuffleMeals: (date?: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
}

const initial = {
  profile: null,
  places: [],
  workouts: [],
  activeWorkout: null,
  weights: [],
  water: {},
  mealShuffle: {},
  settings: { apiKeyConfigured: false, waterReminders: false, sleepReminder: false, mealReminders: false },
  lastPlaceId: null,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      saveProfile: (profile) => {
        set({ profile });
        // 프로필의 체중이 바뀌면 오늘 체중 기록도 맞춰 둔다
        const today = dateKey();
        const existing = get().weights.find((w) => w.date === today);
        if (!existing || existing.weightKg !== profile.weightKg) get().addWeight(profile.weightKg, today);
      },
      addWeight: (weightKg, date = dateKey()) =>
        set((s) => {
          const weights = [...s.weights.filter((w) => w.date !== date), { date, weightKg }].sort((a, b) => a.date.localeCompare(b.date));
          const latest = weights[weights.length - 1];
          const profile = s.profile && latest.date === date ? { ...s.profile, weightKg } : s.profile;
          return { weights, profile };
        }),
      removeWeight: (date) => set((s) => ({ weights: s.weights.filter((w) => w.date !== date) })),

      addPlace: (place) => {
        const id = newId();
        set((s) => ({ places: [...s.places, { ...place, id, createdAt: Date.now() }] }));
        return id;
      },
      updatePlace: (id, patch) => set((s) => ({ places: s.places.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removePlace: (id) =>
        set((s) => ({ places: s.places.filter((p) => p.id !== id), lastPlaceId: s.lastPlaceId === id ? null : s.lastPlaceId })),
      setPlaceEquipment: (placeId, items) => get().updatePlace(placeId, { equipment: items }),
      upsertPlaceEquipment: (placeId, item) =>
        set((s) => ({
          places: s.places.map((p) => {
            if (p.id !== placeId) return p;
            const exists = p.equipment.some((e) => e.equipmentId === item.equipmentId);
            return {
              ...p,
              equipment: exists ? p.equipment.map((e) => (e.equipmentId === item.equipmentId ? { ...e, ...item } : e)) : [...p.equipment, item],
            };
          }),
        })),
      removePlaceEquipment: (placeId, equipmentId) =>
        set((s) => ({
          places: s.places.map((p) => (p.id === placeId ? { ...p, equipment: p.equipment.filter((e) => e.equipmentId !== equipmentId) } : p)),
        })),

      startWorkout: (w) =>
        set({ activeWorkout: { ...w, id: newId(), startedAt: Date.now(), date: dateKey() }, lastPlaceId: w.placeId }),
      updateActiveExercises: (exercises) => set((s) => (s.activeWorkout ? { activeWorkout: { ...s.activeWorkout, exercises } } : {})),
      finishWorkout: () =>
        set((s) => {
          if (!s.activeWorkout) return {};
          const exercises = s.activeWorkout.exercises.filter((e) => e.sets.some((x) => x.done));
          if (exercises.length === 0) return { activeWorkout: null };
          return { workouts: [...s.workouts, { ...s.activeWorkout, exercises, finishedAt: Date.now() }], activeWorkout: null };
        }),
      discardWorkout: () => set({ activeWorkout: null }),
      removeWorkout: (id) => set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      addWater: (ml, date = dateKey()) => set((s) => ({ water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + ml) } })),
      shuffleMeals: (date = dateKey()) => set((s) => ({ mealShuffle: { ...s.mealShuffle, [date]: (s.mealShuffle[date] ?? 0) + 1 } })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetAll: () => set({ ...initial }),
    }),
    {
      name: 'gym-trainer-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** 저장소에서 데이터를 다 불러왔는지 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}
