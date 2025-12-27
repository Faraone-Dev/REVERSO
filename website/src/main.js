/**
 * REVERSO Protocol - Main JavaScript
 * Handles wallet connection, animations, and interactivity
 */

// ==========================================
// Contract Addresses & Config
// ==========================================
const REVERSO_CONFIG = {
    contracts: {
        1: '0x...', // Ethereum Mainnet
        42161: '0x...', // Arbitrum
        8453: '0x...', // Base
        137: '0x...', // Polygon
        10: '0x...', // Optimism
    },
    rpcUrls: {
        1: 'https://eth.llamarpc.com',
        42161: 'https://arb1.arbitrum.io/rpc',
        8453: 'https://mainnet.base.org',
        137: 'https://polygon-rpc.com',
    }
};

const DEMO_MODE = true;

// App State
let appState = {
    connected: false,
    address: null,
    chainId: 1,
    selectedToken: 'ETH',
    selectedDelay: 86400,
    withInsurance: false,
    balance: '0',
    transfers: []
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
    const recovery1 = document.getElementById('recovery1')?.value || '0x0000000000000000000000000000000000000000';
    const recovery2 = document.getElementById('recovery2')?.value || '0x0000000000000000000000000000000000000000';
    
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
        showNotification('Please enter an amount', 'error');
        return;
    }
    
    if (!recipient || !recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        showNotification('Please enter a valid recipient address', 'error');
        return;
    }
    
    try {
        sendBtn.disabled = true;
        sendBtnText.innerHTML = '<span class="loading-spinner"></span> Preparing Transaction...';
        
        // Demo mode: always simulate, never broadcast on-chain
        await simulateTransaction(amount, recipient, DEMO_MODE);
        
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
// Simulate Transaction (Demo)
// ==========================================
async function simulateTransaction(amount, recipient, forceDemo = false) {
    // Show preparing
    showNotification('Preparing transaction...', 'info');
    await sleep(1000);

    if (forceDemo || typeof window.ethereum === 'undefined') {
        // Demo path: no on-chain transaction
        showNotification('Demo: transaction simulated. No funds were moved.', 'success');
        
        // Add to transfers list
        addTransferToList({
            id: Date.now(),
            amount: amount,
            token: appState.selectedToken,
            recipient: recipient,
            delay: appState.selectedDelay,
            timestamp: Date.now(),
            status: 'pending'
        });
        
        return;
    }
    
    try {
        // Request transaction (disabled in demo, guarded above)
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: appState.address,
                to: recipient,
                value: '0x' + BigInt(Math.floor(parseFloat(amount) * 1e18)).toString(16),
                data: '0x'
            }]
        });
        
        showNotification(`Transaction sent! Hash: ${txHash.slice(0, 10)}...`, 'success');
        
        // Add to transfers list
        addTransferToList({
            id: Date.now(),
            amount: amount,
            token: appState.selectedToken,
            recipient: recipient,
            delay: appState.selectedDelay,
            timestamp: Date.now(),
            status: 'pending',
            txHash: txHash
        });
        
    } catch (error) {
        if (error.code === 4001) {
            showNotification('Transaction rejected by user', 'error');
        } else {
            throw error;
        }
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
        const timeRemaining = calculateTimeRemaining(t.timestamp, t.delay);
        const shortRecipient = `${t.recipient.slice(0, 6)}...${t.recipient.slice(-4)}`;
        
        return `
            <div class="transfer-item" data-id="${t.id}">
                <div class="transfer-item-header">
                    <span class="transfer-item-status ${t.status}">${t.status === 'pending' ? '● Reversible' : '✓ Claimable'}</span>
                    <span class="transfer-item-time">${timeRemaining}</span>
                </div>
                <div class="transfer-item-amount">${t.amount} ${t.token}</div>
                <div class="transfer-item-to">To: ${shortRecipient}</div>
                <div class="transfer-item-actions">
                    <button class="btn btn-cancel" onclick="cancelTransfer(${t.id})">Cancel</button>
                    <button class="btn btn-details" onclick="viewTransfer(${t.id})">Details</button>
                </div>
            </div>
        `;
    }).join('');
}

function calculateTimeRemaining(timestamp, delaySeconds) {
    const endTime = timestamp + (delaySeconds * 1000);
    const remaining = endTime - Date.now();
    
    if (remaining <= 0) return 'Claimable';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} remaining`;
}

// Update transfers countdown
setInterval(() => {
    if (appState.transfers.length > 0) {
        renderTransfersList();
    }
}, 1000);

// Transfer actions
window.cancelTransfer = function(id) {
    const transfer = appState.transfers.find(t => t.id === id);
    if (!transfer) return;
    
    showNotification(`Cancelling transfer of ${transfer.amount} ${transfer.token}...`, 'info');
    
    // Simulate cancellation
    setTimeout(() => {
        appState.transfers = appState.transfers.filter(t => t.id !== id);
        renderTransfersList();
        showNotification('Transfer cancelled! Funds returned to your wallet.', 'success');
    }, 1500);
};

window.viewTransfer = function(id) {
    const transfer = appState.transfers.find(t => t.id === id);
    if (!transfer) return;
    
    alert(`Transfer Details:\n\nAmount: ${transfer.amount} ${transfer.token}\nTo: ${transfer.recipient}\nLock Period: ${formatDelay(transfer.delay)}\nStatus: ${transfer.status}\n${transfer.txHash ? 'TX: ' + transfer.txHash : ''}`);
};

function formatDelay(seconds) {
    if (seconds < 3600) return `${seconds / 60} minutes`;
    if (seconds < 86400) return `${seconds / 3600} hours`;
    return `${seconds / 86400} days`;
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
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                connectBtn.innerHTML = `
                    <span class="wallet-dot"></span>
                    Connect Wallet
                `;
            } else {
                updateWalletButton(connectBtn, accounts[0]);
            }
        });
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
    if (typeof window.ethereum === 'undefined') return;
    
    try {
        const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [address, 'latest']
        });
        
        const balanceETH = parseInt(balance, 16) / 1e18;
        appState.balance = balanceETH.toFixed(4);
        
        const balanceEl = document.getElementById('userBalance');
        if (balanceEl) {
            balanceEl.textContent = appState.balance;
        }
    } catch (e) {
        console.error('Balance fetch error:', e);
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
