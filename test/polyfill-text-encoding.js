"use strict";

// TODO: drop this file once `engines.node` is bumped to >= 11. It is a no-op
// on every supported runtime today and only exists for the Node.js 10 leg of
// the legacy-test CI matrix.

// Node 10 lacks the global TextEncoder/TextDecoder that browsers, Deno, Bun and
// Node >= 11 provide; expose them from `util` so the suite (and the library's
// Uint8Array decode path) runs there too. No-op on every supported runtime.
if (typeof TextDecoder === "undefined" || typeof TextEncoder === "undefined") {
	// eslint-disable-next-line n/prefer-global/text-decoder, n/prefer-global/text-encoder
	const { TextDecoder, TextEncoder } = require("util");

	global.TextDecoder = TextDecoder;
	global.TextEncoder = TextEncoder;
}
