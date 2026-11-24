import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { NotFoundNotice } from "@/features/errors/components/not-found-notice";

// A Section's page that calls `notFound()` (an unknown User's id): the
// notice fills the page area and the frame stays. Only `notFound()` lands
// here; an address no page matches is [locale]/not-found.
const SignedInNotFound = () => <NotFoundNotice page={AOFSectionPage} />;

export default SignedInNotFound;
