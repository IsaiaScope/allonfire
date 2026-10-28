// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFDialog,
  AOFDialogContent,
  AOFDialogDescription,
  AOFDialogTitle,
} from "../aof-dialog";

// Open, the dialog is a portal, which only a browser draws: the Back
// Office's Avatar field browser test covers it open.
describe("AOFDialog", () => {
  it("draws nothing while closed", () => {
    expect(
      renderToStaticMarkup(
        <AOFDialog open={false}>
          <AOFDialogContent>
            <AOFDialogTitle>Crop the picture</AOFDialogTitle>
            <AOFDialogDescription>Drag to frame it</AOFDialogDescription>
          </AOFDialogContent>
        </AOFDialog>
      )
    ).not.toContain("Crop the picture");
  });
});
