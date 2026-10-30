// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFCard,
  AOFCardContent,
  AOFCardHeader,
  AOFCardTitle,
} from "../aof-card";

describe("AOFCard", () => {
  it("draws shadcn's card and keeps the caller's classes", () => {
    const html = renderToStaticMarkup(
      <AOFCard className="gap-2">
        <AOFCardHeader>
          <AOFCardTitle>Title</AOFCardTitle>
        </AOFCardHeader>
        <AOFCardContent>Body</AOFCardContent>
      </AOFCard>
    );
    expect(html).toContain('data-slot="card"');
    expect(html).toContain("gap-2");
    expect(html).toContain("Title");
    expect(html).toContain("Body");
  });
});
