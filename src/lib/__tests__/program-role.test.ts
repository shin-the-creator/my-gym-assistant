import { coachRoleInstruction } from '../coach-role';
import { PROGRAM_PRESETS, type ProgramDay, nextDayIndex, planDay, programFocus } from '../routine';
import { apartmentGym, profile, schoolBar, workout } from './fixtures';

describe('custom routines', () => {
  it('offers a push / pull / legs template with readable focus', () => {
    const ppl = PROGRAM_PRESETS.find((p) => p.id === 'ppl')!;
    expect(ppl.days.map((d) => d.name)).toEqual(['미는 날', '당기는 날', '하체 날']);
    expect(ppl.days[0].focus).toBe('가슴 · 어깨 · 가슴 고립');
    expect(programFocus([])).toBe('유산소');
    // 템플릿을 고쳐도 원본이 바뀌지 않도록 복사본이어야 한다
    expect(ppl.days[0].slots[0]).not.toBe(PROGRAM_PRESETS.find((p) => p.id === 'ppl')!.days[1].slots[0]);
  });

  it('uses the exercise I picked when the place has the equipment, otherwise substitutes', () => {
    const day: ProgramDay = { name: '미는 날', focus: '', slots: [{ pattern: 'horizontal_push', role: 'main', preferred: 'push_up' }] };
    const gym = planDay(day, apartmentGym, profile, []);
    expect(gym[0].exercise?.id).toBe('push_up');
    expect(gym[0].reason).toContain('직접 정해 둔');

    const benchDay: ProgramDay = { name: '미는 날', focus: '', slots: [{ pattern: 'horizontal_push', role: 'main', preferred: 'db_bench_press' }] };
    expect(planDay(benchDay, schoolBar, profile, [])[0].exercise?.id).toBe('dips');
  });

  it('continues a custom split by day name', () => {
    const custom: ProgramDay[] = [
      { name: '미는 날', focus: '', slots: [{ pattern: 'horizontal_push', role: 'main' }] },
      { name: '당기는 날', focus: '', slots: [{ pattern: 'vertical_pull', role: 'main' }] },
    ];
    expect(nextDayIndex(custom, [workout({ dayName: '미는 날', dayIndex: 0, exercises: [] })])).toBe(1);
    expect(nextDayIndex(custom, [workout({ dayName: '당기는 날', dayIndex: 1, exercises: [] })])).toBe(0);
  });
});

describe('coach role', () => {
  it('states what the coach does and does not do, with teen rules for minors', () => {
    const adult = coachRoleInstruction(30);
    expect(adult).toContain('할 일');
    expect(adult).toContain('진단');
    expect(adult).not.toContain('청소년');
    expect(coachRoleInstruction(16)).toContain('청소년');
  });
});
