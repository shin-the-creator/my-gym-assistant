import { buildProgram, candidatesFor, nextDayIndex, placeCoverage, planDay } from '../routine';
import { suggest } from '../progress';
import { apartmentGym, profile, schoolBar, workout } from './fixtures';
import { getExercise } from '@/data/exercises';

describe('program', () => {
  it('picks a split by days per week', () => {
    expect(buildProgram({ ...profile, workoutDaysPerWeek: 2 }).map((d) => d.name)).toEqual(['전신 A', '전신 B']);
    expect(buildProgram({ ...profile, workoutDaysPerWeek: 3 }).map((d) => d.name)).toEqual(['전신 A', '전신 B', '전신 C']);
    expect(buildProgram({ ...profile, workoutDaysPerWeek: 3, experience: 'intermediate' }).map((d) => d.name)).toEqual(['푸시', '풀', '레그']);
    expect(buildProgram({ ...profile, workoutDaysPerWeek: 4 })).toHaveLength(4);
    expect(buildProgram({ ...profile, workoutDaysPerWeek: 6 })).toHaveLength(6);
  });

  it('adds cardio finishers when losing fat', () => {
    const program = buildProgram({ ...profile, goal: 'fat_loss' });
    expect(program.every((d) => d.slots[d.slots.length - 1].pattern === 'cardio')).toBe(true);
  });

  it('continues the split across places', () => {
    const program = buildProgram(profile);
    expect(nextDayIndex(program, [])).toBe(0);
    const logs = [workout({ placeId: 'school', dayIndex: 0, dayName: '전신 A', exercises: [] })];
    expect(nextDayIndex(program, logs)).toBe(1);
    logs.push(workout({ placeId: 'apt', dayIndex: 2, dayName: '전신 C', startedAt: 5000, finishedAt: 6000, exercises: [] }));
    expect(nextDayIndex(program, logs)).toBe(0);
  });
});

describe('place-specific planning', () => {
  const program = buildProgram(profile);

  it('uses gym equipment at the apartment gym', () => {
    const plan = planDay(program[0], apartmentGym, profile, []);
    const names = plan.map((p) => p.exercise?.id);
    expect(names).toContain('db_bench_press');
    expect(names).toContain('lat_pulldown');
    expect(names[0]).toBe('leg_press');
  });

  it('swaps to bodyweight moves at the pull-up bar', () => {
    const plan = planDay(program[0], schoolBar, profile, []);
    const byPattern = Object.fromEntries(plan.map((p) => [p.slot.pattern, p.exercise?.id]));
    expect(byPattern.horizontal_push).toBe('dips');
    expect(byPattern.vertical_pull).toBe('negative_pull_up');
    expect(byPattern.squat).toBe('bodyweight_squat');
  });

  it('prefers the exercise you did last time at the same place', () => {
    const logs = [workout({ exercises: [{ exerciseId: 'push_up', pattern: 'horizontal_push', sets: [{ reps: 15, weightKg: 0, done: true }] }] })];
    const plan = planDay(program[0], apartmentGym, profile, logs);
    expect(plan.find((p) => p.slot.pattern === 'horizontal_push')?.exercise?.id).toBe('push_up');
  });

  it('does not repeat the same exercise twice in a day', () => {
    const plan = planDay(program[0], schoolBar, profile, []);
    const ids = plan.map((p) => p.exercise?.id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('honours manual swaps', () => {
    const plan = planDay(program[0], apartmentGym, profile, [], { 1: 'push_up' });
    expect(plan[1].exercise?.id).toBe('push_up');
  });

  it('puts exercises above your level last', () => {
    const list = candidatesFor('vertical_pull', schoolBar, 'beginner');
    expect(list[0].id).toBe('negative_pull_up');
    expect(list.map((e) => e.id)).toContain('pull_up');
  });

  it('reports coverage', () => {
    expect(placeCoverage(program, apartmentGym, 'beginner')).toBeGreaterThan(0.8);
    expect(placeCoverage(program, { ...apartmentGym, equipment: [] }, 'beginner')).toBeGreaterThan(0.5); // 맨몸 대체
  });
});

describe('progression', () => {
  const ex = getExercise('db_bench_press')!;
  const rx = { sets: 3, target: '8-12회', repMin: 8, repMax: 12, restSec: 90 };

  it('adds a rep when not all sets hit the top', () => {
    const logs = [workout({ exercises: [{ exerciseId: ex.id, pattern: ex.pattern, sets: [{ reps: 10, weightKg: 14, done: true }, { reps: 9, weightKg: 14, done: true }, { reps: 8, weightKg: 14, done: true }] }] })];
    const s = suggest(ex, rx, apartmentGym, logs);
    expect(s.weightKg).toBe(14);
    expect(s.reps).toBe(11);
  });

  it('adds weight with the place increment after hitting the top', () => {
    const logs = [workout({ exercises: [{ exerciseId: ex.id, pattern: ex.pattern, sets: [1, 2, 3].map(() => ({ reps: 12, weightKg: 14, done: true })) }] })];
    const s = suggest(ex, rx, apartmentGym, logs);
    expect(s.weightKg).toBe(16);
    expect(s.reps).toBe(8);
  });

  it('caps at the max weight of this place and suggests reps/tempo instead', () => {
    const logs = [workout({ exercises: [{ exerciseId: ex.id, pattern: ex.pattern, sets: [1, 2, 3].map(() => ({ reps: 12, weightKg: 20, done: true })) }] })];
    const s = suggest(ex, rx, apartmentGym, logs);
    expect(s.weightKg).toBe(20);
    expect(s.note).toContain('최대 무게');
  });

  it('progresses bodyweight moves by reps', () => {
    const dips = getExercise('dips')!;
    const logs = [workout({ placeId: 'school', exercises: [{ exerciseId: 'dips', pattern: 'horizontal_push', sets: [{ reps: 7, weightKg: 0, done: true }] }] })];
    const s = suggest(dips, { ...rx, repMin: 6, repMax: 12 }, schoolBar, logs);
    expect(s.reps).toBe(8);
    expect(s.weightKg).toBeUndefined();
  });
});
