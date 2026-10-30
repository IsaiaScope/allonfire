import { NotFoundNotice } from "@/features/errors/components/not-found-notice";

// An address no page matches, or a `notFound()` outside the signed-in frame:
// the notice fills the whole screen.
const NotFound = () => <NotFoundNotice />;

export default NotFound;
