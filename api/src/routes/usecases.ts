import { Router, Response } from 'express';
import { AuthenticatedRequest, incrementTxCount } from '../middleware/apiKey';
import { asyncHandler, BadRequest, NotFound } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { loadChains } from '../config/chains';
import { TransferResponse } from '../types';
import { checkDenylist } from '../utils/fraud';
import * as DB from '../db';

export const usecaseRouter = Router();

const REVERSO_ABI = [
  'function sendETH(address _recipient, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external payable returns (uint256)',
  'function sendETHPremium(address _recipient, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external payable returns (uint256)',
  'function sendToken(address _token, address _recipient, uint256 _amount, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external returns (uint256)'
];

function persistTransfer(t: TransferResponse): void {
  DB.insertTransfer.run({
    id: t.id,
    chainId: t.chainId,
    status: t.status,
    fromAddr: t.from || '',
    toAddr: t.to,
    amount: t.amount,
    token: t.token || 'ETH',
    fee: t.fee || '0',
    insuranceActive: t.insurance?.active ? 1 : 0,
    insurancePremium: t.insurance?.premium || null,
    lockDuration: t.lockDuration,
    expiresAt: t.expiresAt,
    metadata: t.metadata ? JSON.stringify(t.metadata) : null,
    memo: t.memo || null
  });
}

function makeTx(chainId: number, to: string, amount: string, token: string | undefined, delay: number, expiry: number, recovery1: string, recovery2: string, memo: string, withInsurance?: boolean) {
  const iface = new ethers.Interface(REVERSO_ABI);
  let data: string;
  let value = amount;
  if (!token || token === 'ETH') {
    data = iface.encodeFunctionData(withInsurance ? 'sendETHPremium' : 'sendETH', [to, delay, expiry, recovery1, recovery2, memo]);
  } else {
    data = iface.encodeFunctionData('sendToken', [token, to, amount, delay, expiry, recovery1, recovery2, memo]);
    value = '0';
  }
  const CHAINS = loadChains();
  return { to: CHAINS[chainId].contract, data, value, chainId };
}

function buildTransfer({ chainId, to, amount, token, delay, expiry, recovery1, recovery2, memo, metadata, withInsurance }: any): TransferResponse {
  const id = uuidv4();
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
  } as TransferResponse;
}

usecaseRouter.post('/checkout', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { chainId, to, amount, token, memo, recovery1, recovery2, metadata } = req.body;
  const CHAINS = loadChains();
  if (!chainId || !CHAINS[chainId]) throw BadRequest('Unsupported chain');
  if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) throw BadRequest('Invalid recipient');
  if (!amount || BigInt(amount) <= 0n) throw BadRequest('Invalid amount');
  checkDenylist(to);

  const delay = 24 * 60 * 60; // 24h lock for checkout
  const expiry = 30 * 24 * 60 * 60;
  const transfer = buildTransfer({ chainId, to, amount, token, delay, expiry, recovery1: recovery1 || to, recovery2: recovery2 || recovery1 || to, memo: memo || 'checkout', metadata });
  persistTransfer(transfer);
  incrementTxCount(apiKey.id);
  res.status(201).json({ success: true, transfer, transaction: makeTx(chainId, to, amount, token, delay, expiry, recovery1 || to, recovery2 || recovery1 || to, memo || 'checkout') });
}));

usecaseRouter.post('/payroll', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { chainId, payroll, lockDuration = 72 * 3600, expiry = 30 * 24 * 3600 } = req.body;
  const CHAINS = loadChains();
  if (!chainId || !CHAINS[chainId]) throw BadRequest('Unsupported chain');
  if (!Array.isArray(payroll)) throw BadRequest('payroll must be an array');

  const results: any[] = [];
  for (const entry of payroll) {
    const { to, amount, token, memo, recovery1, recovery2, metadata } = entry;
    if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) throw BadRequest('Invalid recipient in payroll');
    if (!amount || BigInt(amount) <= 0n) throw BadRequest('Invalid amount in payroll');
    checkDenylist(to);
    const transfer = buildTransfer({ chainId, to, amount, token, delay: lockDuration, expiry, recovery1: recovery1 || to, recovery2: recovery2 || recovery1 || to, memo: memo || 'payroll', metadata });
    persistTransfer(transfer);
    results.push({ transfer, transaction: makeTx(chainId, to, amount, token, lockDuration, expiry, recovery1 || to, recovery2 || recovery1 || to, memo || 'payroll') });
    incrementTxCount(apiKey.id);
  }
  res.status(201).json({ success: true, count: results.length, items: results });
}));

usecaseRouter.post('/escrow', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { chainId, to, amount, token, memo, recovery1, recovery2, lockDuration = 7 * 24 * 3600, expiry = 60 * 24 * 3600, metadata } = req.body;
  const CHAINS = loadChains();
  if (!chainId || !CHAINS[chainId]) throw BadRequest('Unsupported chain');
  if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) throw BadRequest('Invalid recipient');
  if (!amount || BigInt(amount) <= 0n) throw BadRequest('Invalid amount');
  checkDenylist(to);

  const transfer = buildTransfer({ chainId, to, amount, token, delay: lockDuration, expiry, recovery1: recovery1 || to, recovery2: recovery2 || recovery1 || to, memo: memo || 'escrow', metadata });
  persistTransfer(transfer);
  incrementTxCount(apiKey.id);
  res.status(201).json({ success: true, transfer, transaction: makeTx(chainId, to, amount, token, lockDuration, expiry, recovery1 || to, recovery2 || recovery1 || to, memo || 'escrow') });
}));

usecaseRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const row = DB.findTransferById.get(id) as any;
  if (!row) throw NotFound('Transfer not found');
  res.json({
    transfer: {
      id: row.id,
      chainId: row.chain_id,
      status: row.status,
      from: row.from_addr,
      to: row.to_addr,
      amount: row.amount,
      token: row.token,
      fee: row.fee,
      insurance: row.insurance_active ? { active: true, premium: row.insurance_premium } : undefined,
      lockDuration: row.lock_duration,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      memo: row.memo
    }
  });
}));

export default usecaseRouter;
