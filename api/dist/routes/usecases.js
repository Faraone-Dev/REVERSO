"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usecaseRouter = void 0;
const express_1 = require("express");
const apiKey_1 = require("../middleware/apiKey");
const errorHandler_1 = require("../middleware/errorHandler");
const uuid_1 = require("uuid");
const ethers_1 = require("ethers");
const chains_1 = require("../config/chains");
const fraud_1 = require("../utils/fraud");
exports.usecaseRouter = (0, express_1.Router)();
const REVERSO_ABI = [
    'function sendETH(address _recipient, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external payable returns (uint256)',
    'function sendETHPremium(address _recipient, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external payable returns (uint256)',
    'function sendToken(address _token, address _recipient, uint256 _amount, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external returns (uint256)'
];
const transfers = new Map();
function makeTx(chainId, to, amount, token, delay, expiry, recovery1, recovery2, memo, withInsurance) {
    const iface = new ethers_1.ethers.Interface(REVERSO_ABI);
    let data;
    let value = amount;
    if (!token || token === 'ETH') {
        data = iface.encodeFunctionData(withInsurance ? 'sendETHPremium' : 'sendETH', [to, delay, expiry, recovery1, recovery2, memo]);
    }
    else {
        data = iface.encodeFunctionData('sendToken', [token, to, amount, delay, expiry, recovery1, recovery2, memo]);
        value = '0';
    }
    const CHAINS = (0, chains_1.loadChains)();
    return { to: CHAINS[chainId].contract, data, value, chainId };
}
function buildTransfer({ chainId, to, amount, token, delay, expiry, recovery1, recovery2, memo, metadata, withInsurance }) {
    const id = (0, uuid_1.v4)();
    return {
        id,
        chainId,
        status: 'pending',
        from: '',
        to,
        amount,
        token: token || 'ETH',
        fee: 'auto',
        insurance: withInsurance ? { active: true, premium: 'auto' } : undefined,
        lockDuration: delay,
        expiresAt: Math.floor(Date.now() / 1000) + delay + expiry,
        createdAt: new Date(),
        metadata,
        memo
    };
}
exports.usecaseRouter.post('/checkout', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    const { chainId, to, amount, token, memo, recovery1, recovery2, metadata } = req.body;
    const CHAINS = (0, chains_1.loadChains)();
    if (!chainId || !CHAINS[chainId])
        throw (0, errorHandler_1.BadRequest)('Unsupported chain');
    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to))
        throw (0, errorHandler_1.BadRequest)('Invalid recipient');
    if (!amount || BigInt(amount) <= 0n)
        throw (0, errorHandler_1.BadRequest)('Invalid amount');
    (0, fraud_1.checkDenylist)(to);
    const delay = 24 * 60 * 60; // 24h lock for checkout
    const expiry = 30 * 24 * 60 * 60;
    const transfer = buildTransfer({ chainId, to, amount, token, delay, expiry, recovery1: recovery1 || to, recovery2: recovery2 || recovery1 || to, memo: memo || 'checkout', metadata });
    transfers.set(transfer.id, transfer);
    (0, apiKey_1.incrementTxCount)(apiKey.id);
    res.status(201).json({ success: true, transfer, transaction: makeTx(chainId, to, amount, token, delay, expiry, recovery1 || to, recovery2 || recovery1 || to, memo || 'checkout') });
}));
exports.usecaseRouter.post('/payroll', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    const { chainId, payroll, lockDuration = 72 * 3600, expiry = 30 * 24 * 3600 } = req.body;
    const CHAINS = (0, chains_1.loadChains)();
    if (!chainId || !CHAINS[chainId])
        throw (0, errorHandler_1.BadRequest)('Unsupported chain');
    if (!Array.isArray(payroll))
        throw (0, errorHandler_1.BadRequest)('payroll must be an array');
    const results = [];
    for (const entry of payroll) {
        const { to, amount, token, memo, recovery1, recovery2, metadata } = entry;
        if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to))
            throw (0, errorHandler_1.BadRequest)('Invalid recipient in payroll');
        if (!amount || BigInt(amount) <= 0n)
            throw (0, errorHandler_1.BadRequest)('Invalid amount in payroll');
        (0, fraud_1.checkDenylist)(to);
        const transfer = buildTransfer({ chainId, to, amount, token, delay: lockDuration, expiry, recovery1: recovery1 || to, recovery2: recovery2 || recovery1 || to, memo: memo || 'payroll', metadata });
        transfers.set(transfer.id, transfer);
        results.push({ transfer, transaction: makeTx(chainId, to, amount, token, lockDuration, expiry, recovery1 || to, recovery2 || recovery1 || to, memo || 'payroll') });
        (0, apiKey_1.incrementTxCount)(apiKey.id);
    }
    res.status(201).json({ success: true, count: results.length, items: results });
}));
exports.usecaseRouter.post('/escrow', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const apiKey = req.apiKey;
    const { chainId, to, amount, token, memo, recovery1, recovery2, lockDuration = 7 * 24 * 3600, expiry = 60 * 24 * 3600, metadata } = req.body;
    const CHAINS = (0, chains_1.loadChains)();
    if (!chainId || !CHAINS[chainId])
        throw (0, errorHandler_1.BadRequest)('Unsupported chain');
    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to))
        throw (0, errorHandler_1.BadRequest)('Invalid recipient');
    if (!amount || BigInt(amount) <= 0n)
        throw (0, errorHandler_1.BadRequest)('Invalid amount');
    (0, fraud_1.checkDenylist)(to);
    const transfer = buildTransfer({ chainId, to, amount, token, delay: lockDuration, expiry, recovery1: recovery1 || to, recovery2: recovery2 || recovery1 || to, memo: memo || 'escrow', metadata });
    transfers.set(transfer.id, transfer);
    (0, apiKey_1.incrementTxCount)(apiKey.id);
    res.status(201).json({ success: true, transfer, transaction: makeTx(chainId, to, amount, token, lockDuration, expiry, recovery1 || to, recovery2 || recovery1 || to, memo || 'escrow') });
}));
exports.usecaseRouter.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const transfer = transfers.get(id);
    if (!transfer)
        throw (0, errorHandler_1.NotFound)('Transfer not found');
    res.json({ transfer });
}));
exports.default = exports.usecaseRouter;
