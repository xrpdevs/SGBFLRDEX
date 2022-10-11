import { toChecksumAddress } from 'web3-utils';
import DEFAULT_TOKEN_LIST from '@uniswap/default-token-list';
import { ChainId, Token } from 'neoswap-sdk';
import { Tags, TokenInfo, TokenList } from '@uniswap/token-lists';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../index';
import sortByListPriority from 'utils/listSort';

type TagDetails = Tags[keyof Tags];
export interface TagInfo extends TagDetails {
  id: string;
}

/**
 * Token instances created from token info.
 */
export class WrappedTokenInfo extends Token {
  public readonly tokenInfo: TokenInfo;
  public readonly tags: TagInfo[];
  constructor(tokenInfo: TokenInfo, tags: TagInfo[]) {
    super(
      tokenInfo.chainId,
      toChecksumAddress(tokenInfo.address),
      tokenInfo.decimals,
      tokenInfo.symbol,
      tokenInfo.name
    );
    this.tokenInfo = tokenInfo;
    this.tags = tags;
  }
  public get logoURI(): string | undefined {
    return this.tokenInfo.logoURI;
  }
}

export type TokenAddressMap = Readonly<
  { [chainId in ChainId]: Readonly<{ [tokenAddress: string]: { token: WrappedTokenInfo; list: TokenList } }> }
>;

/**
 * An empty result, useful as a default.
 */
const EMPTY_LIST: TokenAddressMap = {
  [ChainId.MAINNET]: {},
  [ChainId.MOONBASE]: {},
  [ChainId.MOONSHADOW]: {},
  [ChainId.SONGBIRD]: {},
  [ChainId.FLARE]: {},
  [ChainId.COSTON]: {},
  [ChainId.STANDALONE]: {},
  [ChainId.MOONROCK]: {}
};

const listCache: WeakMap<TokenList, TokenAddressMap> | null =
  typeof WeakMap !== 'undefined' ? new WeakMap<TokenList, TokenAddressMap>() : null;

export function listToTokenMap(list: TokenList): TokenAddressMap {
  const result = listCache?.get(list);
  if (result) return result;

  const map = list.tokens.reduce<TokenAddressMap>(
    (tokenMap, tokenInfo) => {
      const tags: TagInfo[] =
        tokenInfo.tags
          ?.map((tagId) => {
            if (!list.tags?.[tagId]) return undefined;
            return { ...list.tags[tagId], id: tagId };
          })
          ?.filter((x): x is TagInfo => Boolean(x)) ?? [];
      const token = new WrappedTokenInfo(tokenInfo, tags);
      if (tokenMap[token.chainId][token.address] !== undefined) throw Error('Duplicate tokens.');
      return {
        ...tokenMap,
        [token.chainId]: {
          ...tokenMap[token.chainId],
          [token.address]: {
            token,
            list: list,
          },
        },
      };
    },
    { ...EMPTY_LIST }
  );
  listCache?.set(list, map);
  return map;
}

export function useAllLists(): {
  readonly [url: string]: {
    readonly current: TokenList | null;
    readonly pendingUpdate: TokenList | null;
    readonly loadingRequestId: string | null;
    readonly error: string | null;
  };
} {
  return useSelector<AppState, AppState['lists']['byUrl']>((state) => state.lists.byUrl);
}

function combineMaps(map1: TokenAddressMap, map2: TokenAddressMap): TokenAddressMap {
  return {
    1: { ...map1[1], ...map2[1] },
    14: { ...map1[14], ...map2[14] },
    16: { ...map1[16], ...map2[16] },
    19: { ...map1[19], ...map2[19] },
    1281: { ...map1[1281], ...map2[1281] },
    1286: { ...map1[1286], ...map2[1286] },
    1287: { ...map1[1287], ...map2[1287] },
    1288: { ...map1[1288], ...map2[1288] }
  };
}

// merge tokens contained within lists from urls
function useCombinedTokenMapFromUrls(urls: string[] | undefined): TokenAddressMap {
  const lists = useAllLists();

  return useMemo(() => {
    if (!urls) return EMPTY_LIST;

    return (
      urls
        .slice()
        // sort by priority so top priority goes last
        .sort(sortByListPriority)
        .reduce((allTokens, currentUrl) => {
          const current = lists[currentUrl]?.current;
          if (!current) return allTokens;
          try {
            const newTokens = Object.assign(listToTokenMap(current));
            return combineMaps(allTokens, newTokens);
          } catch (error) {
            console.error('Could not show token list due to error', error);
            return allTokens;
          }
        }, EMPTY_LIST)
    );
  }, [lists, urls]);
}

// filter out unsupported lists
export function useActiveListUrls(): string[] | undefined {
  return useSelector<AppState, AppState['lists']['activeListUrls']>((state) => state.lists.activeListUrls);
}

export function useInactiveListUrls(): string[] {
  const lists = useAllLists();
  const allActiveListUrls = useActiveListUrls();
  return Object.keys(lists).filter((url) => !allActiveListUrls?.includes(url));
}

// get all the tokens from active lists, combine with local default tokens
export function useCombinedActiveList(): TokenAddressMap {
  const activeListUrls = useActiveListUrls();
  const activeTokens = useCombinedTokenMapFromUrls(activeListUrls);
  const defaultTokenMap = listToTokenMap(DEFAULT_TOKEN_LIST);
  return combineMaps(activeTokens, defaultTokenMap);
}

// all tokens from inactive lists
export function useCombinedInactiveList(): TokenAddressMap {
  const allInactiveListUrls: string[] = useInactiveListUrls();
  return useCombinedTokenMapFromUrls(allInactiveListUrls);
}

// used to hide warnings on import for default tokens
export function useDefaultTokenList(): TokenAddressMap {
  return listToTokenMap(DEFAULT_TOKEN_LIST);
}

export function useIsListActive(url: string): boolean {
  const activeListUrls = useActiveListUrls();
  return Boolean(activeListUrls?.includes(url));
}
