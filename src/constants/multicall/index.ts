import { ChainId } from 'neoswap-sdk';
import MULTICALL_ABI from './abi.json';
import { multicall } from '../../addresses.json'

const MULTICALL_NETWORKS: { [chainId in ChainId]: string } = {
  "1281": "", "1286": "", "1287": "", "1288": "",
  [ChainId.MAINNET]: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
  [ChainId.SONGBIRD]: multicall,
  [ChainId.FLARE]: multicall,
  [ChainId.COSTON]: multicall
};

export { MULTICALL_ABI, MULTICALL_NETWORKS };
