// @module-tag unit
// Type-checked by `pnpm check-types` under this package's tsconfig: these are
// the generated components that break the repo's strict flags, so a consumer
// that stops relaxing them fails here, not on the first AOF date picker.
import { Calendar } from "@allonfire/shadcn/components/calendar";
import { ScrollArea } from "@allonfire/shadcn/components/scroll-area";
import { renderToStaticMarkup } from "react-dom/server";

describe("shadcn components under a consumer's tsconfig", () => {
  it("renders the calendar and the scroll area", () => {
    const html = renderToStaticMarkup(
      <>
        <Calendar />
        <ScrollArea>content</ScrollArea>
      </>
    );
    expect(html).toContain('data-slot="calendar"');
    expect(html).toContain('data-slot="scroll-area"');
  });
});
