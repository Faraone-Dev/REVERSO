/**
 * REVERSO Protocol - Main JavaScript
 * Handles wallet connection, animations, and interactivity
 */

// ==========================================
// Contract Addresses & Config
// ==========================================
const REVERSO_CONFIG = {
    contracts: {
        1: '0x...', // Ethereum Mainnet (TBD)
        11155111: '0x3D1f9d1cEaf350885A91f7Fb05c99a78Bc544ED8', // Sepolia Testnet
        42161: '0x...', // Arbitrum (TBD)
        8453: '0x...', // Base (TBD)
        137: '0x...', // Polygon (TBD)
        10: '0x...', // Optimism (TBD)
    },
    rpcUrls: {
        1: 'https://eth.llamarpc.com',
        11155111: 'https://ethereum-sepolia-rpc.publicnode.com',
        42161: 'https://arb1.arbitrum.io/rpc',
        8453: 'https://mainnet.base.org',
        137: 'https://polygon-rpc.com',
        10: 'https://mainnet.optimism.io',
    },
    chainNames: {
        1: 'Ethereum',
        11155111: 'Sepolia',
        42161: 'Arbitrum',
        8453: 'Base',
        137: 'Polygon',
        10: 'Optimism',
    }
};

// ReversoVault ABI (minimal for sendETH, cancel, claim)
const VAULT_ABI = [
    {
        "inputs": [
            {"name": "_recipient", "type": "address"},
            {"name": "_delay", "type": "uint256"},
            {"name": "_expiryPeriod", "type": "uint256"},
            {"name": "_recoveryAddress1", "type": "address"},
            {"name": "_recoveryAddress2", "type": "address"},
            {"name": "_memo", "type": "string"}
        ],
        "name": "sendETH",
        "outputs": [{"name": "transferId", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_recipient", "type": "address"},
            {"name": "_delay", "type": "uint256"},
            {"name": "_expiryPeriod", "type": "uint256"},
            {"name": "_recoveryAddress1", "type": "address"},
            {"name": "_recoveryAddress2", "type": "address"},
            {"name": "_memo", "type": "string"}
        ],
        "name": "sendETHPremium",
        "outputs": [{"name": "transferId", "type": "uint256"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_transferId", "type": "uint256"}],
        "name": "cancel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_transferId", "type": "uint256"}],
        "name": "claim",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_transferId", "type": "uint256"}],
        "name": "getTransfer",
        "outputs": [
            {"components": [
                {"name": "sender", "type": "address"},
                {"name": "recipient", "type": "address"},
                {"name": "token", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "createdAt", "type": "uint256"},
                {"name": "unlockAt", "type": "uint256"},
                {"name": "expiresAt", "type": "uint256"},
                {"name": "recoveryAddress1", "type": "address"},
                {"name": "recoveryAddress2", "type": "address"},
                {"name": "memo", "type": "string"},
                {"name": "status", "type": "uint8"},
                {"name": "hasInsurance", "type": "bool"}
            ], "name": "", "type": "tuple"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "_user", "type": "address"}],
        "name": "getSentTransfers",
        "outputs": [{"name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "_user", "type": "address"}],
        "name": "getReceivedTransfers",
        "outputs": [{"name": "", "type": "uint256[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "transferCount",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Production mode - set to false for real transactions
const DEMO_MODE = false;

// App State
let appState = {
    connected: false,
    address: null,
    chainId: 11155111, // Default to Sepolia
    selectedToken: 'ETH',
    selectedDelay: 3600, // 1 hour default
    selectedExpiry: 604800, // 7 days default
    withInsurance: false,
    balance: '0',
    transfers: [],
    provider: null,
    signer: null,
    contract: null
};

// ==========================================
// DOM Ready Handler
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initMobileNav();
    initWalletConnect();
    initCounters();
    initSmoothScroll();
    initTransferCardAnimation();
    initAppSection();
    initApiTabs();
    initCopyButtons();
});

// ==========================================
// APP Section Functionality
// ==========================================
function initAppSection() {
    // Network selector
    document.querySelectorAll('.network-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.network-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.chainId = parseInt(btn.dataset.chain);
            updateFees();
        });
    });
    
    // Token selector
    document.querySelectorAll('.token-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.token-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.selectedToken = btn.dataset.token;
            updateFees();
        });
    });
    
    // Delay selector
    document.querySelectorAll('.delay-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.delay-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.selectedDelay = parseInt(btn.dataset.delay);
        });
    });
    
    // Recovery toggle
    const toggleRecovery = document.getElementById('toggleRecovery');
    const recoveryInputs = document.getElementById('recoveryInputs');
    if (toggleRecovery && recoveryInputs) {
        toggleRecovery.addEventListener('click', () => {
            const isVisible = recoveryInputs.style.display !== 'none';
            recoveryInputs.style.display = isVisible ? 'none' : 'flex';
            toggleRecovery.textContent = isVisible ? '+ Add' : '- Hide';
        });
    }
    
    // Insurance toggle
    const insuranceCheckbox = document.getElementById('withInsurance');
    const insuranceFeeRow = document.getElementById('insuranceFeeRow');
    if (insuranceCheckbox) {
        insuranceCheckbox.addEventListener('change', () => {
            appState.withInsurance = insuranceCheckbox.checked;
            if (insuranceFeeRow) {
                insuranceFeeRow.style.display = insuranceCheckbox.checked ? 'flex' : 'none';
            }
            updateFees();
        });
    }
    
    // Amount input
    const amountInput = document.getElementById('sendAmount');
    if (amountInput) {
        amountInput.addEventListener('input', updateFees);
    }
    
    // Send button
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', handleSend);
    }
    
    // Initial fee update
    updateFees();
}

// ==========================================
// Fee Calculation
// ==========================================
function updateFees() {
    const amountInput = document.getElementById('sendAmount');
    const amount = parseFloat(amountInput?.value) || 0;
    
    // Determine fee tier based on USD value (simplified - assume 1 ETH = $2500)
    const ethPrice = 2500;
    const usdValue = amount * ethPrice;
    
    let feePercent;
    if (usdValue < 1000) {
        feePercent = 0.3;
    } else if (usdValue < 100000) {
        feePercent = 0.5;
    } else {
        feePercent = 0.7;
    }
    
    const fee = amount * (feePercent / 100);
    const insuranceFee = appState.withInsurance ? amount * 0.002 : 0;
    const total = amount + fee + insuranceFee;
    
    // Update UI
    const token = appState.selectedToken;
    document.getElementById('feePercent').textContent = feePercent;
    document.getElementById('summaryAmount').textContent = `${amount.toFixed(4)} ${token}`;
    document.getElementById('summaryFee').textContent = `${fee.toFixed(6)} ${token}`;
    document.getElementById('summaryInsurance').textContent = `${insuranceFee.toFixed(6)} ${token}`;
    document.getElementById('summaryTotal').textContent = `${total.toFixed(4)} ${token}`;
}

// ==========================================
// Send Transaction
// ==========================================
async function handleSend() {
    const sendBtn = document.getElementById('sendBtn');
    const sendBtnText = document.getElementById('sendBtnText');
    
    // Check wallet connection
    if (!appState.connected) {
        document.getElementById('connectWallet')?.click();
        return;
    }
    
    // Get form values
    const amount = document.getElementById('sendAmount')?.value;
    const recipient = document.getElementById('recipientAddress')?.value;
    const recovery1 = document.getElementById('recovery1')?.value || ethers.ZeroAddress;
    const recovery2 = document.getElementById('recovery2')?.value || ethers.ZeroAddress;
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('Please enter an amount', 'error');
        return;
    }
    
    if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        showNotification('Please enter a valid recipient address', 'error');
        return;
    }
    
    // Check if contract is available
    if (!appState.contract) {
        showNotification(`ReversoVault not deployed on ${REVERSO_CONFIG.chainNames[appState.chainId] || 'this network'}. Please switch to Sepolia.`, 'error');
        return;
    }
    
    try {
        sendBtn.disabled = true;
        sendBtnText.innerHTML = '<span class="loading-spinner"></span> Preparing Transaction...';
        
        // Execute real transaction
        await executeReversoTransaction(amount, recipient, recovery1, recovery2);
        
        sendBtnText.textContent = 'Send Reversible Transaction';
        sendBtn.disabled = false;
        
    } catch (error) {
        console.error('Send error:', error);
        showNotification(error.message || 'Transaction failed', 'error');
        sendBtnText.textContent = 'Send Reversible Transaction';
        sendBtn.disabled = false;
    }
}

// ==========================================
// Execute Real Reverso Transaction
// ==========================================
async function executeReversoTransaction(amount, recipient, recovery1, recovery2) {
    showNotification('Preparing reversible transaction...', 'info');
    
    try {
        const amountWei = ethers.parseEther(amount);
        const delay = appState.selectedDelay; // in seconds
        const expiryPeriod = 7 * 24 * 60 * 60; // 7 days minimum
        
        // Get fee estimate
        const feeDetails = await appState.contract.calculateFee(amountWei, false); // false = no insurance
        const totalWithFee = feeDetails.totalAmount;
        
        console.log('📊 Transaction Details:');
        console.log('   Amount:', ethers.formatEther(amountWei), 'ETH');
        console.log('   Fee:', ethers.formatEther(feeDetails.fee), 'ETH');
        console.log('   Total:', ethers.formatEther(totalWithFee), 'ETH');
        console.log('   Delay:', delay, 'seconds');
        console.log('   Recipient:', recipient);
        
        showNotification('Please confirm the transaction in your wallet...', 'info');
        
        // Call sendETH on the contract
        const tx = await appState.contract.sendETH(
            recipient,
            delay,
            expiryPeriod,
            recovery1,
            recovery2,
            { value: totalWithFee }
        );
        
        showNotification(`Transaction submitted! Waiting for confirmation...`, 'info');
        console.log('📤 TX Hash:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        // Parse TransferCreated event
        let transferId = null;
        for (const log of receipt.logs) {
            try {
                const parsed = appState.contract.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                if (parsed?.name === 'TransferCreated') {
                    transferId = parsed.args.transferId;
                    console.log('✅ Transfer Created! ID:', transferId.toString());
                }
            } catch (e) {
                // Not our event, skip
            }
        }
        
        // Get explorer URL
        const explorerUrl = getExplorerUrl(appState.chainId, tx.hash);
        
        showNotification(
            `✅ Reversible transfer created! <a href="${explorerUrl}" target="_blank">View on Explorer</a>`,
            'success'
        );
        
        // Add to transfers list
        addTransferToList({
            id: transferId?.toString() || Date.now().toString(),
            amount: amount,
            token: 'ETH',
            recipient: recipient,
            delay: delay,
            timestamp: Date.now(),
            status: 'pending',
            txHash: tx.hash,
            unlockAt: Date.now() + (delay * 1000)
        });
        
        // Clear form
        document.getElementById('sendAmount').value = '';
        document.getElementById('recipientAddress').value = '';
        
    } catch (error) {
        console.error('Transaction error:', error);
        
        if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
            showNotification('Transaction rejected by user', 'error');
        } else if (error.message?.includes('insufficient funds')) {
            showNotification('Insufficient funds for transaction + gas', 'error');
        } else if (error.message?.includes('InvalidDelay')) {
            showNotification('Delay must be between 1 hour and 30 days', 'error');
        } else if (error.message?.includes('InvalidExpiryPeriod')) {
            showNotification('Expiry period must be at least 7 days', 'error');
        } else if (error.message?.includes('InvalidAmount')) {
            showNotification('Amount must be greater than 0', 'error');
        } else {
            throw error;
        }
    }
}

// Get block explorer URL
function getExplorerUrl(chainId, txHash) {
    const explorers = {
        1: 'https://etherscan.io/tx/',
        11155111: 'https://sepolia.etherscan.io/tx/',
        42161: 'https://arbiscan.io/tx/',
        10: 'https://optimistic.etherscan.io/tx/',
        137: 'https://polygonscan.com/tx/',
        8453: 'https://basescan.org/tx/'
    };
    return (explorers[chainId] || 'https://etherscan.io/tx/') + txHash;
}

// Load user's transfers from contract
async function loadUserTransfers() {
    if (!appState.contract || !appState.address) return;
    
    try {
        // Get sent and received transfers
        const [sentIds, receivedIds] = await Promise.all([
            appState.contract.getSentTransfers(appState.address),
            appState.contract.getReceivedTransfers(appState.address)
        ]);
        
        console.log('📋 Sent transfers:', sentIds.length);
        console.log('📋 Received transfers:', receivedIds.length);
        
        // Combine and dedupe
        const allIds = [...new Set([...sentIds, ...receivedIds])];
        
        // Fetch transfer details
        appState.transfers = [];
        for (const id of allIds.slice(-20)) { // Last 20 transfers
            try {
                const transfer = await appState.contract.getTransfer(id);
                appState.transfers.push({
                    id: id.toString(),
                    amount: ethers.formatEther(transfer.amount),
                    token: transfer.token === ethers.ZeroAddress ? 'ETH' : 'TOKEN',
                    tokenAddress: transfer.token,
                    sender: transfer.sender,
                    recipient: transfer.recipient,
                    status: ['Pending', 'Completed', 'Cancelled', 'Refunded', 'Frozen'][transfer.status],
                    statusCode: Number(transfer.status),
                    unlockAt: Number(transfer.unlockAt) * 1000,
                    expiresAt: Number(transfer.expiresAt) * 1000,
                    createdAt: Number(transfer.createdAt) * 1000,
                    delay: Number(transfer.unlockAt) - Number(transfer.createdAt),
                    isSender: transfer.sender.toLowerCase() === appState.address.toLowerCase(),
                    isReceiver: transfer.recipient.toLowerCase() === appState.address.toLowerCase()
                });
            } catch (e) {
                console.error('Failed to load transfer', id.toString(), e);
            }
        }
        
        // Sort by creation time, newest first
        appState.transfers.sort((a, b) => b.createdAt - a.createdAt);
        
        renderTransfersList();
        
    } catch (error) {
        console.error('Failed to load transfers:', error);
    }
}

// ==========================================
// Transfers List Management
// ==========================================
function addTransferToList(transfer) {
    appState.transfers.unshift(transfer);
    renderTransfersList();
}

function renderTransfersList() {
    const container = document.getElementById('transfersList');
    if (!container) return;
    
    if (appState.transfers.length === 0) {
        container.innerHTML = `
            <div class="no-transfers">
                <span>📭</span>
                <p>No active transfers</p>
                <small>Your reversible transfers will appear here</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = appState.transfers.map(t => {
        const timeRemaining = calculateTimeRemaining(t.unlockAt || t.timestamp + t.delay * 1000);
        const shortRecipient = `${t.recipient.slice(0, 6)}...${t.recipient.slice(-4)}`;
        const shortSender = t.sender ? `${t.sender.slice(0, 6)}...${t.sender.slice(-4)}` : '';
        
        // Determine status display
        let statusClass = t.statusCode !== undefined ? ['pending', 'completed', 'cancelled', 'refunded', 'frozen'][t.statusCode] : t.status;
        let statusText = t.status || 'Pending';
        
        const now = Date.now();
        const isClaimable = t.statusCode === 0 && t.unlockAt && now >= t.unlockAt;
        const isPending = t.statusCode === 0 && t.unlockAt && now < t.unlockAt;
        const isExpired = t.statusCode === 0 && t.expiresAt && now >= t.expiresAt;
        
        // Determine which buttons to show
        let actionButtons = '';
        if (t.statusCode === 0) { // Pending
            if (t.isSender && !isExpired) {
                actionButtons += `<button class="btn btn-cancel" onclick="handleCancel('${t.id}')">Cancel & Refund</button>`;
            }
            if (t.isReceiver && isClaimable && !isExpired) {
                actionButtons += `<button class="btn btn-claim" onclick="handleClaim('${t.id}')">Claim Funds</button>`;
            }
        }
        actionButtons += `<button class="btn btn-details" onclick="viewTransfer('${t.id}')">Details</button>`;
        
        return `
            <div class="transfer-item ${statusClass}" data-id="${t.id}">
                <div class="transfer-item-header">
                    <span class="transfer-item-status ${statusClass}">
                        ${isPending ? '⏳ Locked' : isClaimable ? '✅ Claimable' : isExpired ? '⏰ Expired' : statusText}
                    </span>
                    <span class="transfer-item-badge ${t.isSender ? 'sent' : 'received'}">
                        ${t.isSender ? '↗ Sent' : '↘ Received'}
                    </span>
                </div>
                <div class="transfer-item-amount">${t.amount} ${t.token}</div>
                <div class="transfer-item-to">
                    ${t.isSender ? `To: ${shortRecipient}` : `From: ${shortSender}`}
                </div>
                <div class="transfer-item-time">${isPending ? timeRemaining : ''}</div>
                <div class="transfer-item-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }).join('');
}

function calculateTimeRemaining(unlockTimestamp) {
    const remaining = unlockTimestamp - Date.now();
    
    if (remaining <= 0) return 'Unlocked';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m remaining`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} remaining`;
}

// Update transfers countdown
setInterval(() => {
    if (appState.transfers.length > 0) {
        renderTransfersList();
    }
}, 1000);

// Expose loadUserTransfers globally for refresh button
window.loadUserTransfers = loadUserTransfers;

// Cancel Transfer (real contract call)
window.handleCancel = async function(transferId) {
    if (!appState.contract) {
        showNotification('Contract not connected', 'error');
        return;
    }
    
    const transfer = appState.transfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    try {
        showNotification(`Cancelling transfer of ${transfer.amount} ${transfer.token}...`, 'info');
        
        const tx = await appState.contract.cancel(transferId);
        showNotification('Transaction submitted, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        const explorerUrl = getExplorerUrl(appState.chainId, tx.hash);
        showNotification(
            `✅ Transfer cancelled! Funds refunded. <a href="${explorerUrl}" target="_blank">View TX</a>`,
            'success'
        );
        
        // Reload transfers
        await loadUserTransfers();
        
    } catch (error) {
        console.error('Cancel error:', error);
        if (error.code === 'ACTION_REJECTED') {
            showNotification('Transaction rejected', 'error');
        } else if (error.message?.includes('TransferAlreadyClaimed')) {
            showNotification('Transfer already claimed', 'error');
        } else if (error.message?.includes('NotSender')) {
            showNotification('Only sender can cancel', 'error');
        } else {
            showNotification('Failed to cancel transfer', 'error');
        }
    }
};

// Claim Transfer (real contract call)
window.handleClaim = async function(transferId) {
    if (!appState.contract) {
        showNotification('Contract not connected', 'error');
        return;
    }
    
    const transfer = appState.transfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    try {
        showNotification(`Claiming ${transfer.amount} ${transfer.token}...`, 'info');
        
        const tx = await appState.contract.claim(transferId, {
            gasLimit: 300000 // Ensure enough gas
        });
        showNotification('Transaction submitted, waiting for confirmation...', 'info');
        
        await tx.wait();
        
        const explorerUrl = getExplorerUrl(appState.chainId, tx.hash);
        showNotification(
            `✅ Funds claimed successfully! <a href="${explorerUrl}" target="_blank">View TX</a>`,
            'success'
        );
        
        // Reload transfers
        await loadUserTransfers();
        
    } catch (error) {
        console.error('Claim error:', error);
        if (error.code === 'ACTION_REJECTED') {
            showNotification('Transaction rejected', 'error');
        } else if (error.message?.includes('TransferStillLocked')) {
            showNotification('Transfer is still locked', 'error');
        } else if (error.message?.includes('NotRecipient')) {
            showNotification('Only recipient can claim', 'error');
        } else if (error.message?.includes('TransferExpired')) {
            showNotification('Transfer has expired', 'error');
        } else {
            showNotification('Failed to claim transfer', 'error');
        }
    }
};

window.viewTransfer = function(transferId) {
    const transfer = appState.transfers.find(t => t.id === transferId);
    if (!transfer) return;
    
    const unlockDate = transfer.unlockAt ? new Date(transfer.unlockAt).toLocaleString() : 'N/A';
    const expiryDate = transfer.expiresAt ? new Date(transfer.expiresAt).toLocaleString() : 'N/A';
    const createdDate = transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : 'N/A';
    
    const details = `
Transfer Details
================
ID: ${transfer.id}
Amount: ${transfer.amount} ${transfer.token}
Status: ${transfer.status}

From: ${transfer.sender || 'You'}
To: ${transfer.recipient}

Created: ${createdDate}
Unlocks: ${unlockDate}
Expires: ${expiryDate}

${transfer.txHash ? 'TX: ' + transfer.txHash : ''}
    `.trim();
    
    alert(details);
};

function formatDelay(seconds) {
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    return `${Math.round(seconds / 86400)} days`;
}

// ==========================================
// Utility Functions
// ==========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// API Tabs & Copy Code
// ==========================================
function initApiTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Remove active from all
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Activate clicked tab
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`)?.classList.add('active');
        });
    });
}

// Copy code to clipboard
window.copyCode = function(element) {
    const codeBlock = element.closest('.api-code').querySelector('code');
    const text = codeBlock.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = element.textContent;
        element.textContent = '✓ Copied!';
        element.style.background = 'var(--primary)';
        element.style.color = '#000';
        
        setTimeout(() => {
            element.textContent = originalText;
            element.style.background = '';
            element.style.color = '';
        }, 2000);
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
};

// Copy buttons (addresses, etc.)
function initCopyButtons() {
    const buttons = document.querySelectorAll('[data-copy]');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.getAttribute('data-copy');
            if (!value) return;
            navigator.clipboard.writeText(value).then(() => {
                const original = btn.textContent;
                btn.textContent = 'Copied';
                setTimeout(() => { btn.textContent = original; }, 1500);
            }).catch(() => {
                showNotification('Copy failed', 'error');
            });
        });
    });
}

// ==========================================
// Scroll Animations
// ==========================================
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.problem-card, .layer, .step, .tier, .api-plan, .section-header'
    );
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animatedElements.forEach((el) => {
        el.classList.add('scroll-animate');
        // Remove stagger to make text appear immediately
        el.style.transitionDelay = '0s';
        observer.observe(el);
    });
}

// ==========================================
// Mobile Navigation
// ==========================================
function initMobileNav() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    
    if (!toggle) return;
    
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        
        // Create mobile menu if doesn't exist
        let mobileMenu = document.querySelector('.mobile-menu');
        
        if (!mobileMenu) {
            mobileMenu = document.createElement('div');
            mobileMenu.className = 'mobile-menu';
            mobileMenu.innerHTML = `
                <div class="mobile-menu-content">
                    ${navLinks ? navLinks.innerHTML : ''}
                    ${navActions ? navActions.innerHTML : ''}
                </div>
            `;
            document.querySelector('.nav').appendChild(mobileMenu);
            
            // Add styles
            mobileMenu.style.cssText = `
                position: fixed;
                top: var(--nav-height);
                left: 0;
                right: 0;
                background: rgba(10, 10, 15, 0.98);
                backdrop-filter: blur(20px);
                padding: 24px;
                border-bottom: 1px solid var(--border-color);
                transform: translateY(-100%);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 999;
            `;
            
            const content = mobileMenu.querySelector('.mobile-menu-content');
            content.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 16px;
            `;
            
            content.querySelectorAll('a').forEach(link => {
                link.style.cssText = `
                    color: var(--text-primary);
                    text-decoration: none;
                    font-size: 1.1rem;
                    padding: 12px 0;
                    border-bottom: 1px solid var(--border-color);
                `;
            });
        }
        
        if (toggle.classList.contains('active')) {
            mobileMenu.style.transform = 'translateY(0)';
            mobileMenu.style.opacity = '1';
            document.body.style.overflow = 'hidden';
        } else {
            mobileMenu.style.transform = 'translateY(-100%)';
            mobileMenu.style.opacity = '0';
            document.body.style.overflow = '';
        }
    });
    
    // Close on link click
    document.addEventListener('click', (e) => {
        if (e.target.closest('.mobile-menu a')) {
            toggle.classList.remove('active');
            const mobileMenu = document.querySelector('.mobile-menu');
            if (mobileMenu) {
                mobileMenu.style.transform = 'translateY(-100%)';
                mobileMenu.style.opacity = '0';
            }
            document.body.style.overflow = '';
        }
    });
}

// ==========================================
// Wallet Connection
// ==========================================
// Wallet Connection (with ethers.js)
// ==========================================
async function initWalletConnect() {
    const connectBtn = document.getElementById('connectWallet');
    if (!connectBtn) return;
    
    // Check if already connected
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            if (accounts.length > 0) {
                await setupProvider();
                updateWalletButton(connectBtn, accounts[0]);
            }
        } catch (e) {
            console.log('Not connected');
        }
    }
    
    connectBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (typeof window.ethereum === 'undefined') {
            showNotification('Please install MetaMask or another Web3 wallet', 'error');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }
        
        try {
            connectBtn.innerHTML = `
                <span class="loading-spinner"></span>
                Connecting...
            `;
            
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length > 0) {
                await setupProvider();
                updateWalletButton(connectBtn, accounts[0]);
                showNotification('Wallet connected successfully!', 'success');
            }
        } catch (error) {
            console.error('Connection error:', error);
            connectBtn.innerHTML = `
                <span class="wallet-dot"></span>
                Connect Wallet
            `;
            
            if (error.code === 4001) {
                showNotification('Connection rejected', 'error');
            } else {
                showNotification('Failed to connect wallet', 'error');
            }
        }
    });
    
    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts.length === 0) {
                appState.connected = false;
                appState.address = null;
                appState.provider = null;
                appState.signer = null;
                appState.contract = null;
                connectBtn.innerHTML = `
                    <span class="wallet-dot"></span>
                    Connect Wallet
                `;
            } else {
                await setupProvider();
                updateWalletButton(connectBtn, accounts[0]);
            }
        });
        
        // Listen for chain changes
        window.ethereum.on('chainChanged', async (chainId) => {
            appState.chainId = parseInt(chainId, 16);
            if (appState.connected) {
                await setupProvider();
                showNotification(`Switched to ${REVERSO_CONFIG.chainNames[appState.chainId] || 'Unknown Network'}`, 'info');
            }
        });
    }
}

// Setup ethers provider, signer, and contract
async function setupProvider() {
    if (typeof window.ethereum === 'undefined') return;
    
    try {
        // Use ethers.js BrowserProvider for modern ethers v6
        appState.provider = new ethers.BrowserProvider(window.ethereum);
        appState.signer = await appState.provider.getSigner();
        appState.address = await appState.signer.getAddress();
        
        const network = await appState.provider.getNetwork();
        appState.chainId = Number(network.chainId);
        
        // Get contract address for current chain
        const contractAddress = REVERSO_CONFIG.contracts[appState.chainId];
        
        if (contractAddress && contractAddress !== '0x...') {
            appState.contract = new ethers.Contract(contractAddress, VAULT_ABI, appState.signer);
            console.log(`✅ Connected to ReversoVault on ${REVERSO_CONFIG.chainNames[appState.chainId]}`);
        } else {
            appState.contract = null;
            console.log(`⚠️ No contract deployed on ${REVERSO_CONFIG.chainNames[appState.chainId] || 'this network'}`);
        }
        
        // Load user transfers
        if (appState.contract) {
            await loadUserTransfers();
        }
        
    } catch (error) {
        console.error('Failed to setup provider:', error);
    }
}

function updateWalletButton(btn, address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    btn.innerHTML = `
        <span class="wallet-dot connected"></span>
        ${shortAddress}
    `;
    btn.classList.add('connected');
    
    // Update app state
    appState.connected = true;
    appState.address = address;
    
    // Update send button
    const sendBtnText = document.getElementById('sendBtnText');
    if (sendBtnText) {
        sendBtnText.textContent = 'Send Reversible Transaction';
    }
    
    // Update balance
    updateBalance(address);
}

async function updateBalance(address) {
    if (!appState.provider) return;
    
    try {
        const balance = await appState.provider.getBalance(address);
        appState.balance = ethers.formatEther(balance);
        
        // Update UI if element exists
        const balanceDisplay = document.getElementById('walletBalance');
        if (balanceDisplay) {
            balanceDisplay.textContent = `${parseFloat(appState.balance).toFixed(4)} ETH`;
        }
    } catch (error) {
        console.error('Failed to get balance:', error);
    }
}

// ==========================================
// Notification System
// ==========================================
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="notification-message">${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'rgba(0, 255, 136, 0.1)' : type === 'error' ? 'rgba(255, 75, 75, 0.1)' : 'rgba(0, 212, 255, 0.1)'};
        border: 1px solid ${type === 'success' ? 'rgba(0, 255, 136, 0.3)' : type === 'error' ? 'rgba(255, 75, 75, 0.3)' : 'rgba(0, 212, 255, 0.3)'};
        border-radius: 12px;
        color: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4b4b' : '#00d4ff'};
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ==========================================
// Counter Animation
// ==========================================
function initCounters() {
    const counters = document.querySelectorAll('.stat-value, .problem-amount, .total-value, .cta-stat-value');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const text = el.textContent;
                
                // Check if it's a money value
                const match = text.match(/\$?([\d.]+)([BMK])?/);
                if (match) {
                    const target = parseFloat(match[1]);
                    const suffix = match[2] || '';
                    const prefix = text.includes('$') ? '$' : '';
                    
                    animateCounter(el, 0, target, 2000, prefix, suffix);
                }
                
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el, start, end, duration, prefix = '', suffix = '') {
    const startTime = performance.now();
    const endValue = el.textContent;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeOutQuart;
        
        // Format number
        const formatted = current.toFixed(end % 1 !== 0 ? 1 : 0);
        el.textContent = `${prefix}${formatted}${suffix}`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = endValue;
        }
    }
    
    requestAnimationFrame(update);
}

// ==========================================
// Smooth Scroll
// ==========================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                e.preventDefault();
                
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==========================================
// Transfer Card Animation
// ==========================================
function initTransferCardAnimation() {
    const card = document.querySelector('.transfer-card');
    if (!card) return;
    
    const timeDisplay = card.querySelector('.transfer-time');
    if (!timeDisplay) return;
    
    // Countdown animation
    let hours = 23, minutes = 59, seconds = 42;
    
    setInterval(() => {
        seconds--;
        if (seconds < 0) {
            seconds = 59;
            minutes--;
        }
        if (minutes < 0) {
            minutes = 59;
            hours--;
        }
        if (hours < 0) {
            hours = 23;
            minutes = 59;
            seconds = 59;
        }
        
        timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} remaining`;
    }, 1000);
    
    // Mouse parallax effect
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    });
}

// ==========================================
// Nav Scroll Effect
// ==========================================
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.nav');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        nav.style.background = 'rgba(10, 10, 15, 0.95)';
    } else {
        nav.style.background = 'rgba(10, 10, 15, 0.8)';
    }
    
    lastScroll = currentScroll;
});

// ==========================================
// Layer Hover Effects
// ==========================================
document.querySelectorAll('.layer').forEach(layer => {
    layer.addEventListener('mouseenter', () => {
        const number = layer.querySelector('.layer-number');
        if (number) {
            number.style.transform = 'scale(1.1)';
        }
    });
    
    layer.addEventListener('mouseleave', () => {
        const number = layer.querySelector('.layer-number');
        if (number) {
            number.style.transform = 'scale(1)';
        }
    });
});

// ==========================================
// Export for external use
// ==========================================
window.REVERSO = {
    showNotification,
    connectWallet: () => document.getElementById('connectWallet')?.click()
};
