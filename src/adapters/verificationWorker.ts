import { runReview } from "../core/runReview";
import type { ReviewSnapshot } from "../core/types";
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ReviewSnapshot>) => void) | null;
  postMessage: (value: unknown) => void;
};
scope.onmessage = (event) => {
  runReview(event.data)
    .then((result) => scope.postMessage({ result }))
    .catch((error) =>
      scope.postMessage({
        error: error instanceof Error ? error.message : "Verification failed.",
      }),
    );
};
