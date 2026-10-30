// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFAlertDialog } from "../aof-alert-dialog";

const nothing = () => undefined;

// Open, the dialog is a portal, which only a browser draws: the Back
// Office's browser tests cover it open, pending included.
describe("AOFAlertDialog", () => {
  it("draws nothing while closed", () => {
    expect(
      renderToStaticMarkup(
        <AOFAlertDialog
          cancel="Cancel"
          confirm="Delete"
          description="This cannot be undone."
          onConfirm={nothing}
          onOpenChange={nothing}
          open={false}
          pending={false}
          title="Delete 1 User?"
        />
      )
    ).not.toContain("Delete 1 User?");
  });
});
