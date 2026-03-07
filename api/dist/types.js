"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChain = exports.loadChains = exports.PLAN_CONFIG = void 0;
// Plan configuration
exports.PLAN_CONFIG = {
    starter: {
        price: 99,
        txLimit: 100,
        webhooks: false,
        dashboard: false,
        whiteLabel: false,
        sla: false,
        prioritySupport: false
    },
    business: {
        price: 499,
        txLimit: -1, // unlimited
        webhooks: true,
        dashboard: true,
        whiteLabel: false,
        sla: false,
        prioritySupport: true
    },
    enterprise: {
        price: 2000,
        txLimit: -1, // unlimited
        webhooks: true,
        dashboard: true,
        whiteLabel: true,
        sla: true,
        prioritySupport: true
    }
};
// Supported chains
// Chains are now loaded dynamically from config/chains.json
var chains_1 = require("./config/chains");
Object.defineProperty(exports, "loadChains", { enumerable: true, get: function () { return chains_1.loadChains; } });
Object.defineProperty(exports, "getChain", { enumerable: true, get: function () { return chains_1.getChain; } });
