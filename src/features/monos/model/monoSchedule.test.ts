import { describe, expect, it } from "vitest";
import { automationScheduleLabel, nextAutomationRunAt } from "./monoSchedule";

const at = (value: string) => new Date(value).getTime();

describe("automation schedules", () => {
  it("moves hourly schedules to the next occurrence", () => {
    expect(
      nextAutomationRunAt(
        { scheduleKind: "hourly", minute: 15, time: "09:00", dayOfWeek: 1 },
        at("2026-09-19T10:20:00"),
      ),
    ).toBe(at("2026-09-19T11:15:00"));
  });

  it("skips weekends for weekday schedules", () => {
    expect(
      nextAutomationRunAt(
        { scheduleKind: "weekdays", minute: 0, time: "09:00", dayOfWeek: 1 },
        at("2026-09-18T10:00:00"),
      ),
    ).toBe(at("2026-09-21T09:00:00"));
  });

  it("keeps a later occurrence on the same day", () => {
    expect(
      nextAutomationRunAt(
        { scheduleKind: "daily", minute: 0, time: "18:00", dayOfWeek: 1 },
        at("2026-09-19T10:00:00"),
      ),
    ).toBe(at("2026-09-19T18:00:00"));
  });

  it("describes weekly schedules", () => {
    expect(
      automationScheduleLabel({
        scheduleKind: "weekly",
        minute: 0,
        time: "09:00",
        dayOfWeek: 1,
      }),
    ).toMatch(/^Monday at /);
  });
});
