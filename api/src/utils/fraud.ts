const DENYLIST = (process.env.ADDRESS_DENYLIST || '').split(',').map(a => a.trim().toLowerCase()).filter(Boolean);

export function checkDenylist(address: string) {
  if (!address) return;
  if (DENYLIST.includes(address.toLowerCase())) {
    const err: any = new Error('Recipient is blocked');
    err.status = 400;
    throw err;
  }
}
