"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDenylist = checkDenylist;
const DENYLIST = (process.env.ADDRESS_DENYLIST || '').split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
function checkDenylist(address) {
    if (!address)
        return;
    if (DENYLIST.includes(address.toLowerCase())) {
        const err = new Error('Recipient is blocked');
        err.status = 400;
        throw err;
    }
}
