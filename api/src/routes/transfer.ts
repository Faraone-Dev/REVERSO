import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { AuthenticatedRequest, incrementTxCount } from '../middleware/apiKey';
import { asyncHandler, BadRequest, NotFound } from '../middleware/errorHandler';
import { TransferRequest, TransferResponse } from '../types';
import { checkDenylist } from '../utils/fraud';
import { loadChains } from '../config/chains';

export const transferRouter = Router();

// In-memory transfer store (use DB in production)
const transfers: Map<string, TransferResponse> = new Map();

// ReversoVault ABI (aligned to current contract)
const REVERSO_ABI = [
  'function sendETH(address _recipient, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external payable returns (uint256)',
  'function sendETHPremium(address _recipient, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external payable returns (uint256)',
  'function sendToken(address _token, address _recipient, uint256 _amount, uint256 _delay, uint256 _expiryPeriod, address _recoveryAddress1, address _recoveryAddress2, string _memo) external returns (uint256)',
  'function cancel(uint256 transferId) external',
  'function claim(uint256 transferId) external',
  'function getTransfer(uint256 transferId) external view returns (tuple(address sender, address recipient, address token, uint256 amount, uint256 createdAt, uint256 unlockAt, uint256 expiresAt, address recoveryAddress1, address recoveryAddress2, string memo, uint8 status, bool hasInsurance))',
  'function transferCount() external view returns (uint256)',
  'event TransferCreated(uint256 indexed transferId, address indexed sender, address indexed recipient, address token, uint256 amount, uint256 unlockAt, uint256 expiresAt, string memo)'
];

/**
 * POST /api/v1/transfers
 * Create new reversible transfer
 */
transferRouter.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const apiKey = req.apiKey!;
  const { chainId, to, amount, token, lockDuration, expiry, recovery1, recovery2, memo, metadata, withInsurance } = req.body as TransferRequest & { withInsurance?: boolean };

  // Validate chain
  const CHAINS = loadChains();
  if (!chainId || !CHAINS[chainId]) {
    throw BadRequest(`Unsupported chain. Supported: ${Object.keys(CHAINS).join(', ')}`);
  }

  // Validate recipient and recovery addresses
  if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
    throw BadRequest('Invalid recipient address');
  }
  checkDenylist(to);
  if (recovery1 && recovery1 === '0x0000000000000000000000000000000000000000') {
    throw BadRequest('Invalid recovery1 address');
  }
  if (recovery2 && recovery2 === '0x0000000000000000000000000000000000000000') {
    throw BadRequest('Invalid recovery2 address');
  }

  // Validate amount
  if (!amount || BigInt(amount) <= 0n) {
    throw BadRequest('Invalid amount');
  }

  const chain = CHAINS[chainId];
  const transferId = uuidv4();
  const delay = lockDuration || 24 * 60 * 60; // default 24h
  const expiryPeriod = expiry || 30 * 24 * 60 * 60; // default 30d
  // If client does not provide recovery addresses, default them to sender placeholder (= recipient) to avoid invalid address formats
  const recoveryAddr1 = recovery1 || to;
  const recoveryAddr2 = recovery2 || recoveryAddr1;
  const memoStr = memo || '';
  if (memoStr.length > 256) {
    throw BadRequest('Memo too long (max 256 chars)');
  }

  // Create transfer record
  const transfer: TransferResponse = {
    id: transferId,
    chainId,
    status: 'pending',
    from: '', // Will be set when signed
    to,
    amount,
    token: token || 'ETH',
    fee: calculateFee(amount),
    insurance: withInsurance ? {
      active: true,
      premium: calculateInsurancePremium(amount)
    } : undefined,
    lockDuration: delay,
    expiresAt: Math.floor(Date.now() / 1000) + delay + expiryPeriod,
    createdAt: new Date(),
    metadata
  };

  transfers.set(transferId, transfer);

  // Increment usage
  incrementTxCount(apiKey.id);

  // For actual blockchain interaction, encode the function call
  // Using ethers Interface to encode without needing a provider
  const iface = new ethers.Interface(REVERSO_ABI);
  
  let data: string;
  let value = amount;
  
  if (!token || token === 'ETH') {
    if (withInsurance) {
      data = iface.encodeFunctionData('sendETHPremium', [
        to,
        delay,
        expiryPeriod,
        recoveryAddr1,
        recoveryAddr2,
        memoStr
      ]);
    } else {
      data = iface.encodeFunctionData('sendETH', [
        to,
        delay,
        expiryPeriod,
        recoveryAddr1,
        recoveryAddr2,
        memoStr
      ]);
    }
  } else {
    data = iface.encodeFunctionData('sendToken', [
      token,
      to,
      amount,
      delay,
      expiryPeriod,
      recoveryAddr1,
      recoveryAddr2,
      memoStr
    ]);
    value = '0';
  }

  res.status(201).json({
    success: true,
    transfer,
    transaction: {
      to: chain.contract,
      data,
      value,
      chainId
    },
    instructions: 'Sign and broadcast this transaction with your wallet'
  });
}));

/**
 * POST /api/v1/transfers/:id/confirm
 * Confirm transfer after blockchain submission
 */
transferRouter.post('/:id/confirm', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { txHash, from } = req.body;

  const transfer = transfers.get(id);
  if (!transfer) {
    throw NotFound('Transfer not found');
  }

  if (!txHash) {
    throw BadRequest('Transaction hash required');
  }

  // Update transfer
  transfer.txHash = txHash;
  transfer.from = from;
  transfer.status = 'submitted';
  transfer.expiresAt = Math.floor(Date.now() / 1000) + transfer.lockDuration;
  
  transfers.set(id, transfer);

  const chains = loadChains();
  res.json({
    success: true,
    transfer,
    explorer: `${chains[transfer.chainId]?.explorer || ''}/tx/${txHash}`
  });
}));

/**
 * GET /api/v1/transfers/:id
 * Get transfer status
 */
transferRouter.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const transfer = transfers.get(id);
  if (!transfer) {
    throw NotFound('Transfer not found');
  }

  res.json({ transfer });
}));

/**
 * GET /api/v1/transfers
 * List transfers
 */
transferRouter.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const CHAINS = loadChains();
  const { status, chainId, limit = 50, offset = 0 } = req.query;

  let results = Array.from(transfers.values());

  // Filter by status
  if (status) {
    results = results.filter(t => t.status === status);
  }

  // Filter by chain
  if (chainId) {
    results = results.filter(t => t.chainId === Number(chainId));
  }

  // Sort by date desc
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Paginate
  const paginated = results.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    transfers: paginated,
    total: results.length,
    limit: Number(limit),
    offset: Number(offset),
    chains: Object.values(CHAINS)
  });
}));

/**
 * POST /api/v1/transfers/:id/cancel
 * Generate cancel transaction
 */
transferRouter.post('/:id/cancel', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  const transfer = transfers.get(id);
  if (!transfer) {
    throw NotFound('Transfer not found');
  }

  if (transfer.status !== 'locked' && transfer.status !== 'submitted') {
    throw BadRequest('Transfer cannot be cancelled');
  }

  const CHAINS = loadChains();
  const chain = CHAINS[transfer.chainId];
  const iface = new ethers.Interface(REVERSO_ABI);
  // NOTE: map internal transfer id -> on-chain transferId in production
  const data = iface.encodeFunctionData('cancel', [0]);

  res.json({
    success: true,
    transaction: {
      to: chain.contract,
      data,
      chainId: transfer.chainId
    },
    instructions: 'Sign and broadcast to cancel the transfer'
  });
}));

/**
 * GET /api/v1/transfers/chains
 * Get supported chains
 */
transferRouter.get('/info/chains', (req, res) => {
  const CHAINS = loadChains();
  res.json({ chains: Object.values(CHAINS) });
});

// Helper: Calculate fee based on amount (progressive fees)
function calculateFee(amount: string): string {
  const amountBigInt = BigInt(amount);
  const eth1 = BigInt('1000000000000000000'); // 1 ETH
  const eth10 = eth1 * 10n;

  let feeBps: bigint;
  if (amountBigInt < eth1) {
    feeBps = 30n; // 0.3% retail
  } else if (amountBigInt < eth10) {
    feeBps = 50n; // 0.5% standard
  } else {
    feeBps = 70n; // 0.7% whale
  }

  return ((amountBigInt * feeBps) / 10000n).toString();
}

// Helper: Calculate insurance premium (0.2%)
function calculateInsurancePremium(amount: string): string {
  const amountBigInt = BigInt(amount);
  return ((amountBigInt * 20n) / 10000n).toString();
}
