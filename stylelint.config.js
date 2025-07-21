// stylelint.config.js
module.exports = {
    extends: [
        "stylelint-config-standard",
        "stylelint-config-recommended-scss",
        "stylelint-config-html",
    ],
    plugins: [
        "stylelint-order"
    ],
    rules: {
        "block-no-empty": true,
        "color-no-invalid-hex": true,
        "order/order": [
        "custom-properties",
        "declarations"
        ],
        "order/properties-alphabetical-order": true
    },
    ignoreFiles: [
        "**/node_modules/**",
        "**/dist/**"
    ]
};
