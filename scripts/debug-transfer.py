from web3 import Web3
import time

rpc = 'https://ethereum-sepolia-rpc.publicnode.com'
vault = '0x3D1f9d1cEaf350885A91f7Fb05c99a78Bc544ED8'
receiver = '0xb9279e38f6eab17f986E7133C60a46DE527628e3'

w3 = Web3(Web3.HTTPProvider(rpc))
abi = [
    {'inputs':[{'name':'','type':'uint256'}],'name':'transfers','outputs':[
        {'name':'sender','type':'address'},
        {'name':'recipient','type':'address'},
        {'name':'token','type':'address'},
        {'name':'amount','type':'uint256'},
        {'name':'createdAt','type':'uint256'},
        {'name':'unlockAt','type':'uint256'},
        {'name':'expiresAt','type':'uint256'},
        {'name':'recoveryAddress1','type':'address'},
        {'name':'recoveryAddress2','type':'address'},
        {'name':'memo','type':'string'},
        {'name':'status','type':'uint8'},
        {'name':'hasInsurance','type':'bool'}
    ],'stateMutability':'view','type':'function'}
]

c = w3.eth.contract(address=vault, abi=abi)
t = c.functions.transfers(2).call()
now = int(time.time())
status_names = ['Pending', 'Completed', 'Cancelled', 'Expired', 'Frozen']

print("=== Transfer #2 Debug ===")
print(f"Sender: {t[0]}")
print(f"Recipient: {t[1]}")
print(f"Token: {t[2]}")
print(f"Amount: {w3.from_wei(t[3], 'ether')} ETH")
print(f"Created At: {t[4]}")
print(f"Unlock At: {t[5]}")
print(f"Expires At: {t[6]}")
print(f"Recovery1: {t[7]}")
print(f"Recovery2: {t[8]}")
print(f"Memo: {t[9]}")
print(f"Status: {t[10]} ({status_names[t[10]]})")
print(f"Has Insurance: {t[11]}")
print()
print(f"Current time: {now}")
print(f"Unlock diff: {now - t[5]} seconds")
print(f"Receiver matches: {t[1].lower() == receiver.lower()}")
print()
print(f"Vault balance: {w3.from_wei(w3.eth.get_balance(vault), 'ether')} ETH")
