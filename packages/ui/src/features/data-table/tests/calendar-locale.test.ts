// @module-tag unit
import { calendarLocaleOf } from "../utils/calendar-locale";

describe("calendarLocaleOf", () => {
  it("gives each language the Apps speak its own calendar words", () => {
    expect(calendarLocaleOf("it").code).toBe("it");
    expect(calendarLocaleOf("en").code).toBe("en-US");
  });

  it("falls back to the default language for one it does not know", () => {
    expect(calendarLocaleOf("xx").code).toBe("en-US");
    expect(calendarLocaleOf(undefined).code).toBe("en-US");
  });
});
