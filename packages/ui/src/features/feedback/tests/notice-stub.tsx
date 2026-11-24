import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import type { AOFNoticeFrame } from "../types/notice";

/** A frame that only shows what the shared notice handed it. */
export const StubFrame: AOFNoticeFrame = ({
  action,
  children,
  heading,
  kind,
  reference,
}) => (
  <section data-kind={kind}>
    <h1>{heading}</h1>
    {children}
    {reference ? <p>{reference}</p> : null}
    {action}
  </section>
);

/** An action dressing a test can find: a class and a mark per action. */
export const STUB_ACTIONS = {
  className: "DRESSED",
  marks: {
    back: <i>BACK</i>,
    enter: <i>ENTER</i>,
    retry: <i>RETRY</i>,
    save: <i>SAVE</i>,
    send: <i>SEND</i>,
  },
} as const satisfies AOFActionDressing;
