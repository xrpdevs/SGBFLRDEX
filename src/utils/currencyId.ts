import {Currency, DEV, Token} from 'neoswap-sdk';

export function currencyId(currency: Currency): string {
    if (currency === DEV) return 'ETH';
    if (currency instanceof Token) return currency.address;
  throw new Error('invalid currency');
}
