import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { EmergencyGuardian, ReversoMonitor, ReversoVault } from "../typechain-types";

describe("EmergencyGuardian", function () {
    
    // ═══════════════════════════════════════════════════════════════
    //                         FIXTURES
    // ═══════════════════════════════════════════════════════════════
    
    async function deployFixture() {
        const [owner, secondary, guardian1, guardian2, attacker, treasury] = await ethers.getSigners();
        
        // Deploy ReversoVault first
        const ReversoVault = await ethers.getContractFactory("ReversoVault");
        const vault = await ReversoVault.deploy(treasury.address) as unknown as ReversoVault;
        await vault.waitForDeployment();
        
        // Deploy EmergencyGuardian
        const EmergencyGuardianFactory = await ethers.getContractFactory("EmergencyGuardian");
        const guardian = await EmergencyGuardianFactory.deploy(secondary.address) as unknown as EmergencyGuardian;
        await guardian.waitForDeployment();
        
        // Link vault to guardian
        await guardian.linkVault(await vault.getAddress());
        
        // Transfer vault ownership to guardian
        await vault.transferOwnership(await guardian.getAddress());
        
        return { vault, guardian, owner, secondary, guardian1, guardian2, attacker, treasury };
    }
    
    // ═══════════════════════════════════════════════════════════════
    //                         DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════
    
    describe("Deployment", function () {
        it("Should set correct owner and secondary", async function () {
            const { guardian, owner, secondary } = await loadFixture(deployFixture);
            
            expect(await guardian.owner()).to.equal(owner.address);
            expect(await guardian.secondaryGuardian()).to.equal(secondary.address);
        });
        
        it("Should initialize emergency guardians", async function () {
            const { guardian, owner, secondary } = await loadFixture(deployFixture);
            
            expect(await guardian.emergencyGuardians(owner.address)).to.be.true;
            expect(await guardian.emergencyGuardians(secondary.address)).to.be.true;
            expect(await guardian.guardianCount()).to.equal(2);
        });
        
        it("Should link vault correctly", async function () {
            const { guardian, vault } = await loadFixture(deployFixture);
            
            expect(await guardian.vault()).to.equal(await vault.getAddress());
        });
        
        it("Should revert with zero secondary address", async function () {
            const EmergencyGuardian = await ethers.getContractFactory("EmergencyGuardian");
            await expect(EmergencyGuardian.deploy(ethers.ZeroAddress))
                .to.be.revertedWithCustomError(EmergencyGuardian, "InvalidAddress");
        });
    });
    
    // ═══════════════════════════════════════════════════════════════
    //                      EMERGENCY PAUSE
    // ═══════════════════════════════════════════════════════════════
    
    describe("Emergency Pause", function () {
        it("Should allow owner to emergency pause", async function () {
            const { guardian, vault, owner } = await loadFixture(deployFixture);
            
            await expect(guardian.connect(owner).emergencyPause("Test emergency"))
                .to.emit(guardian, "EmergencyPauseTriggered")
                .withArgs(owner.address, "Test emergency");
            
            expect(await vault.paused()).to.be.true;
            expect(await guardian.emergencyMode()).to.be.true;
        });
        
        it("Should allow secondary to emergency pause", async function () {
            const { guardian, vault, secondary } = await loadFixture(deployFixture);
            
            await guardian.connect(secondary).emergencyPause("Secondary triggered");
            
            expect(await vault.paused()).to.be.true;
        });
        
        it("Should allow added guardian to emergency pause", async function () {
            const { guardian, vault, owner, guardian1 } = await loadFixture(deployFixture);
            
            // Add guardian1 as emergency guardian
            await guardian.connect(owner).addEmergencyGuardian(guardian1.address);
            
            await guardian.connect(guardian1).emergencyPause("Guardian1 triggered");
            
            expect(await vault.paused()).to.be.true;
        });
        
        it("Should NOT allow random address to pause", async function () {
            const { guardian, attacker } = await loadFixture(deployFixture);
            
            await expect(guardian.connect(attacker).emergencyPause("Hacker attempt"))
                .to.be.revertedWithCustomError(guardian, "NotAuthorized");
        });
    });
    
    // ═══════════════════════════════════════════════════════════════
    //                    TIMELOCK ACTIONS
    // ═══════════════════════════════════════════════════════════════
    
    describe("Timelock Actions", function () {
        
        it("Should propose action and set correct timelock", async function () {
            const { guardian, owner, treasury } = await loadFixture(deployFixture);
            
            const tx = await guardian.connect(owner).proposeAction(
                0, // CHANGE_TREASURY
                treasury.address
            );
            
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt!.blockNumber);
            const expectedExecuteTime = block!.timestamp + 24 * 60 * 60; // 24 hours
            
            const action = await guardian.getAction(1);
            expect(action.actionType).to.equal(0);
            expect(action.target).to.equal(treasury.address);
            expect(action.executed).to.be.false;
            expect(action.proposedBy).to.equal(owner.address);
        });
        
        it("Should require second confirmation", async function () {
            const { guardian, owner, secondary, treasury } = await loadFixture(deployFixture);
            
            // Propose action
            await guardian.connect(owner).proposeAction(0, treasury.address);
            
            // Same person cannot confirm
            await expect(guardian.connect(owner).confirmAction(1))
                .to.be.revertedWithCustomError(guardian, "NeedsSecondConfirmation");
            
            // Different person can confirm
            await expect(guardian.connect(secondary).confirmAction(1))
                .to.emit(guardian, "ActionConfirmed")
                .withArgs(1, secondary.address);
        });
        
        it("Should NOT execute before timelock expires", async function () {
            const { guardian, owner, secondary, treasury } = await loadFixture(deployFixture);
            
            await guardian.connect(owner).proposeAction(0, treasury.address);
            await guardian.connect(secondary).confirmAction(1);
            
            // Try to execute immediately
            await expect(guardian.connect(owner).executeAction(1))
                .to.be.revertedWithCustomError(guardian, "TimelockNotExpired");
        });
        
        it("Should execute after timelock expires", async function () {
            const { guardian, owner, secondary, guardian1 } = await loadFixture(deployFixture);
            
            // First pause the vault to test unpause
            await guardian.connect(owner).emergencyPause("Test");
            
            // Propose unpause
            await guardian.connect(owner).proposeAction(1, ethers.ZeroAddress); // UNPAUSE
            await guardian.connect(secondary).confirmAction(1);
            
            // Fast forward 24 hours
            await time.increase(24 * 60 * 60 + 1);
            
            // Now can execute
            await expect(guardian.connect(owner).executeAction(1))
                .to.emit(guardian, "ActionExecuted")
                .withArgs(1, 1); // actionId, actionType
        });
        
        it("Should cancel pending action", async function () {
            const { guardian, owner, secondary, treasury } = await loadFixture(deployFixture);
            
            await guardian.connect(owner).proposeAction(0, treasury.address);
            
            await expect(guardian.connect(owner).cancelAction(1))
                .to.emit(guardian, "ActionWasCancelled")
                .withArgs(1, owner.address);
            
            const action = await guardian.getAction(1);
            expect(action.cancelled).to.be.true;
        });
        
        it("Should NOT execute cancelled action", async function () {
            const { guardian, owner, secondary, treasury } = await loadFixture(deployFixture);
            
            await guardian.connect(owner).proposeAction(0, treasury.address);
            await guardian.connect(secondary).confirmAction(1);
            await guardian.connect(owner).cancelAction(1);
            
            await time.increase(24 * 60 * 60 + 1);
            
            await expect(guardian.connect(owner).executeAction(1))
                .to.be.revertedWithCustomError(guardian, "ActionIsCancelled");
        });
        
        it("Should NOT execute without confirmation", async function () {
            const { guardian, owner, treasury } = await loadFixture(deployFixture);
            
            await guardian.connect(owner).proposeAction(0, treasury.address);
            
            await time.increase(24 * 60 * 60 + 1);
            
            await expect(guardian.connect(owner).executeAction(1))
                .to.be.revertedWithCustomError(guardian, "NeedsSecondConfirmation");
        });
    });
    
    // ═══════════════════════════════════════════════════════════════
    //                 GUARDIAN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    
    describe("Guardian Management", function () {
        it("Should add emergency guardian", async function () {
            const { guardian, owner, guardian1 } = await loadFixture(deployFixture);
            
            await expect(guardian.connect(owner).addEmergencyGuardian(guardian1.address))
                .to.emit(guardian, "EmergencyGuardianUpdated")
                .withArgs(guardian1.address, true);
            
            expect(await guardian.emergencyGuardians(guardian1.address)).to.be.true;
            expect(await guardian.guardianCount()).to.equal(3);
        });
        
        it("Should remove emergency guardian", async function () {
            const { guardian, owner, guardian1 } = await loadFixture(deployFixture);
            
            await guardian.connect(owner).addEmergencyGuardian(guardian1.address);
            
            await expect(guardian.connect(owner).removeEmergencyGuardian(guardian1.address))
                .to.emit(guardian, "EmergencyGuardianUpdated")
                .withArgs(guardian1.address, false);
            
            expect(await guardian.emergencyGuardians(guardian1.address)).to.be.false;
            expect(await guardian.guardianCount()).to.equal(2);
        });
        
        it("Should NOT remove owner or secondary", async function () {
            const { guardian, owner, secondary } = await loadFixture(deployFixture);
            
            await expect(guardian.connect(owner).removeEmergencyGuardian(owner.address))
                .to.be.revertedWithCustomError(guardian, "CannotRemoveLastGuardian");
            
            await expect(guardian.connect(owner).removeEmergencyGuardian(secondary.address))
                .to.be.revertedWithCustomError(guardian, "CannotRemoveLastGuardian");
        });
    });
    
    // ═══════════════════════════════════════════════════════════════
    //                     VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    describe("View Functions", function () {
        it("Should return correct vault status", async function () {
            const { guardian, vault, treasury } = await loadFixture(deployFixture);
            
            const status = await guardian.getVaultStatus();
            
            expect(status.vaultAddress).to.equal(await vault.getAddress());
            expect(status.vaultOwner).to.equal(await guardian.getAddress());
            expect(status.vaultTreasury).to.equal(treasury.address);
            expect(status.isPaused).to.be.false;
            expect(status.isEmergencyMode).to.be.false;
        });
        
        it("Should check guardian status correctly", async function () {
            const { guardian, owner, secondary, guardian1, attacker } = await loadFixture(deployFixture);
            
            let status = await guardian.isGuardian(owner.address);
            expect(status.isEmergency).to.be.true;
            expect(status.isOwnerOrSecondary).to.be.true;
            
            status = await guardian.isGuardian(secondary.address);
            expect(status.isEmergency).to.be.true;
            expect(status.isOwnerOrSecondary).to.be.true;
            
            status = await guardian.isGuardian(attacker.address);
            expect(status.isEmergency).to.be.false;
            expect(status.isOwnerOrSecondary).to.be.false;
        });
        
        it("Should track timelock remaining", async function () {
            const { guardian, owner, treasury } = await loadFixture(deployFixture);
            
            await guardian.connect(owner).proposeAction(0, treasury.address);
            
            const remaining = await guardian.getTimelockRemaining(1);
            expect(remaining).to.be.closeTo(24 * 60 * 60, 10); // ~24 hours
            
            await time.increase(12 * 60 * 60); // 12 hours
            
            const remainingAfter = await guardian.getTimelockRemaining(1);
            expect(remainingAfter).to.be.closeTo(12 * 60 * 60, 10); // ~12 hours
        });
    });
});

describe("ReversoMonitor", function () {
    
    async function deployMonitorFixture() {
        const [owner, keeper, user1, user2] = await ethers.getSigners();
        
        // Deploy mock vault
        const ReversoVaultFactory = await ethers.getContractFactory("ReversoVault");
        const vault = await ReversoVaultFactory.deploy(owner.address) as unknown as ReversoVault;
        await vault.waitForDeployment();
        
        // Deploy EmergencyGuardian
        const EmergencyGuardianFactory = await ethers.getContractFactory("EmergencyGuardian");
        const guardian = await EmergencyGuardianFactory.deploy(keeper.address) as unknown as EmergencyGuardian;
        await guardian.waitForDeployment();
        
        // Deploy Monitor
        const ReversoMonitorFactory = await ethers.getContractFactory("ReversoMonitor");
        const monitor = await ReversoMonitorFactory.deploy(await vault.getAddress()) as unknown as ReversoMonitor;
        await monitor.waitForDeployment();
        
        // Setup connections
        await guardian.linkVault(await vault.getAddress());
        await vault.transferOwnership(await guardian.getAddress());
        await monitor.setGuardian(await guardian.getAddress());
        
        // Add monitor as guardian for auto-pause
        await guardian.addEmergencyGuardian(await monitor.getAddress());
        
        return { vault, guardian, monitor, owner, keeper, user1, user2 };
    }
    
    describe("Recording Transactions", function () {
        it("Should record transaction correctly", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            await expect(monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("1")))
                .to.emit(monitor, "TransactionRecorded")
                .withArgs(user1.address, ethers.parseEther("1"), ethers.parseEther("1"));
            
            const stats = await monitor.getAddressStats(user1.address);
            expect(stats.txCount).to.equal(1);
            expect(stats.volume).to.equal(ethers.parseEther("1"));
        });
        
        it("Should track hourly volume", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("10"));
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("20"));
            
            const status = await monitor.getStatus();
            expect(status.hourlyVolume).to.equal(ethers.parseEther("30"));
            expect(status.hourlyTxCount).to.equal(2);
        });
        
        it("Should reset hourly counters after 1 hour", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("10"));
            
            // Fast forward 1 hour
            await time.increase(3600 + 1);
            
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("5"));
            
            const status = await monitor.getStatus();
            expect(status.hourlyVolume).to.equal(ethers.parseEther("5")); // Reset
            expect(status.hourlyTxCount).to.equal(1);
        });
    });
    
    describe("Anomaly Detection", function () {
        it("Should trigger alert on large transaction", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            // Send transaction >= suspiciousAmountThreshold (50 ETH)
            await expect(monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("55")))
                .to.emit(monitor, "AlertTriggered")
                .and.to.emit(monitor, "AddressAddedToWatchlist");
            
            const stats = await monitor.getAddressStats(user1.address);
            expect(stats.isWatchlisted).to.be.true;
        });
        
        it("Should trigger critical alert and auto-pause on volume spike", async function () {
            const { monitor, vault, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            // Send transactions exceeding 2x maxVolumePerHour (200 ETH)
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("100"));
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("110"));
            
            // Should have triggered auto-pause
            expect(await vault.paused()).to.be.true;
        });
        
        it("Should track alerts triggered count", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            // Trigger an alert
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("55"));
            
            const stats = await monitor.getOverallStats();
            expect(stats._alertsTriggered).to.be.gte(1);
        });
    });
    
    describe("Watchlist", function () {
        it("Should manually add to watchlist", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            await expect(monitor.connect(owner).addToWatchlist(user1.address, "Suspicious actor"))
                .to.emit(monitor, "AddressAddedToWatchlist")
                .withArgs(user1.address, "Suspicious actor");
            
            const stats = await monitor.getAddressStats(user1.address);
            expect(stats.isWatchlisted).to.be.true;
        });
        
        it("Should remove from watchlist", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            await monitor.connect(owner).addToWatchlist(user1.address, "Test");
            await monitor.connect(owner).removeFromWatchlist(user1.address);
            
            const stats = await monitor.getAddressStats(user1.address);
            expect(stats.isWatchlisted).to.be.false;
        });
    });
    
    describe("Chainlink Automation Compatibility", function () {
        it("Should return upkeep needed on high alert", async function () {
            const { monitor, owner, user1 } = await loadFixture(deployMonitorFixture);
            
            // Trigger high alert
            await monitor.connect(owner).recordTransaction(user1.address, ethers.parseEther("55"));
            
            const [upkeepNeeded, performData] = await monitor.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.true;
        });
        
        it("Should return no upkeep needed when normal", async function () {
            const { monitor } = await loadFixture(deployMonitorFixture);
            
            const [upkeepNeeded] = await monitor.checkUpkeep("0x");
            expect(upkeepNeeded).to.be.false;
        });
    });
    
    describe("Configuration", function () {
        it("Should update thresholds", async function () {
            const { monitor, owner } = await loadFixture(deployMonitorFixture);
            
            await expect(monitor.connect(owner).setMaxVolumePerHour(ethers.parseEther("200")))
                .to.emit(monitor, "ThresholdUpdated");
            
            expect(await monitor.maxVolumePerHour()).to.equal(ethers.parseEther("200"));
        });
        
        it("Should manage keepers", async function () {
            const { monitor, owner, keeper } = await loadFixture(deployMonitorFixture);
            
            await monitor.connect(owner).setAuthorizedKeeper(keeper.address, true);
            expect(await monitor.authorizedKeepers(keeper.address)).to.be.true;
        });
    });
    
    describe("Health Check", function () {
        it("Should report health status", async function () {
            const { monitor } = await loadFixture(deployMonitorFixture);
            
            const [vaultLinked, guardianLinked, monitoring] = await monitor.healthCheck();
            
            expect(vaultLinked).to.be.true;
            expect(guardianLinked).to.be.true;
            expect(monitoring).to.be.true;
        });
    });
});
