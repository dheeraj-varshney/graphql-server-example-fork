"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dd_trace_1 = require("dd-trace");
dd_trace_1.default.init(); // initialized in a different file to avoid hoisting.
dd_trace_1.default.use('graphql', {
    hooks: {
        execute: (span, args, res) => {
            span ? span.addTags({ custom_http_code: 701 }) : null;
            if (span && span['_spanContext']._tags.error) {
                // span.setTag('http', {status_code: 530})
                // span.setTag('error', {: 530})
                span.addTags({ custom_status_code: 700 });
                let errorFound = res.errors[0].message.match(/^([1-5][0-9][0-9])/);
                let errorCode = errorFound ? errorFound[0] : null;
                if (errorCode === '403') {
                    span.setTag('error', null); // remove any error set by the tracer
                }
                else if (errorCode) {
                    span.setTag('error', { status_code: errorCode });
                }
            }
        }
    }
});
exports.default = dd_trace_1.default;
//# sourceMappingURL=tracer.js.map