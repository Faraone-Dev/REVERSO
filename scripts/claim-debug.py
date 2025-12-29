from web3 import Web3
from eth_account import Account

receiver_pk = '0xd612612801b75cb08d28a0e68b62d95b6b364452db9cf8cf7caf7d9491416ce6'
vault = '0x3D1f9d1cEaf350885A91f7Fb05c99a78Bc544ED8'
rpc = 'https://ethereum-sepolia-rpc.publicnode.com'
transfer_id = 2

w3 = Web3(Web3.HTTPProvider(rpc))
receiver = Account.from_key(receiver_pk)

print(f"Receiver: {receiver.address}")
print(f"Balance: {w3.from_wei(w3.eth.get_balance(receiver.address), 'ether')} ETH")

# Try to simulate the call first
vault_abi = [
    {'inputs':[{'name':'_transferId','type':'uint256'}],'name':'claim','outputs':[],'stateMutability':'nonpayable','type':'function'},
]

vault_contract = w3.eth.contract(address=vault, abi=vault_abi)

print("\nSimulating claim...")
try:
    # This will raise an exception with the revert reason
    result = vault_contract.functions.claim(transfer_id).call({'from': receiver.address})
    print(f"Simulation succeeded: {result}")
except Exception as e:
    print(f"Simulation failed: {e}")

print("\nTrying actual transaction with more gas...")
try:
    claim_tx = vault_contract.functions.claim(transfer_id).build_transaction({
        'from': receiver.address,
        'gas': 500000,
        'gasPrice': int(w3.eth.gas_price * 1.5),
        'nonce': w3.eth.get_transaction_count(receiver.address, 'pending'),
        'chainId': 11155111
    })

    signed = receiver.sign_transaction(claim_tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f'TX Hash: {tx_hash.hex()}')
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt.status == 1:
        print(f'\n✅ CLAIM SUCCESSFUL!')
        print(f'Gas used: {receipt.gasUsed}')
    else:
        print(f'\n❌ CLAIM FAILED!')
        print(f'Gas used: {receipt.gasUsed}')
except Exception as e:
    print(f"Error: {e}")

print(f'\n🔗 https://sepolia.etherscan.io/tx/{tx_hash.hex()}')
