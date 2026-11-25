// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFCard,
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "../components/aof-card";

describe("AOFCard", () => {
  it("draws shadcn's card and keeps the caller's classes", () => {
    const html = renderToStaticMarkup(
      <AOFCard className="caller-class">
        <AOFCardHeader>
          <AOFCardTitle>Title</AOFCardTitle>
        </AOFCardHeader>
        <AOFCardContent>Body</AOFCardContent>
      </AOFCard>
    );
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("caller-class");
    expect(html).toContain("Title");
    expect(html).toContain("Body");
  });

  it("lays a line along its foot, in the colour the caller gives it, when it has a foot", () => {
    const html = renderToStaticMarkup(
      <AOFCard className="after:bg-primary/40" foot>
        Body
      </AOFCard>
    );
    for (const part of [
      "relative",
      "isolate",
      "after:absolute",
      "after:inset-x-0",
      "after:bottom-0",
      "after:h-0.5",
      "after:bg-primary/40",
    ]) {
      expect(html).toContain(part);
    }
  });

  it("draws no line without a foot", () => {
    expect(renderToStaticMarkup(<AOFCard>Body</AOFCard>)).not.toContain(
      "after:h-0.5"
    );
  });
});
