import nock from 'nock';

import { GAS_PRICE_DEFAULT } from '@config';
import { fAccounts, fNetwork, fNetworks } from '@fixtures';
import { WalletId } from '@types';

import { fetchUniversalGasPriceEstimate } from './gasPriceFunctions';

jest.mock('@vendor', () => {
  return {
    ...jest.requireActual('@vendor'),
    FallbackProvider: jest.fn().mockImplementation(() => ({
      getBlock: jest.fn().mockResolvedValue({
        baseFeePerGas: '10000000000'
      })
    }))
  };
});

describe('fetchUniversalGasPriceEstimate', () => {
  it('uses EIP 1559 if possible', () => {
    return expect(
      fetchUniversalGasPriceEstimate(
        { ...fNetwork, supportsEIP1559: true },
        { ...fAccounts[1], wallet: WalletId.WEB3 }
      )
    ).resolves.toStrictEqual({ maxFeePerGas: '20', maxPriorityFeePerGas: '3' });
  });

  it('falls back to gas price endpoint if network doesnt support EIP 1559', () => {
    nock(/.*/)
      .get(/.*/)
      .reply(200, () => ({
        safeLow: 33,
        standard: 39,
        fast: 42,
        fastest: 58,
        blockNum: 12781209
      }));
    return expect(
      fetchUniversalGasPriceEstimate({
        ...fNetworks[0],
        supportsEIP1559: false,
        shouldEstimateGasPrice: true
      })
    ).resolves.toStrictEqual({ gasPrice: '42' });
  });

  it('falls back to default gas estimation settings if gas price endpoint fails', () => {
    nock(/.*/).get(/.*/).replyWithError('foo');
    return expect(
      fetchUniversalGasPriceEstimate({
        ...fNetworks[0],
        supportsEIP1559: false,
        shouldEstimateGasPrice: true
      })
    ).resolves.toStrictEqual({ gasPrice: fNetworks[0].gasPriceSettings.initial.toString() });
  });

  it('falls back to default gas estimation settings if gas price endpoint not available', () => {
    return expect(
      fetchUniversalGasPriceEstimate({ ...fNetwork, supportsEIP1559: false })
    ).resolves.toStrictEqual({ gasPrice: fNetwork.gasPriceSettings.initial.toString() });
  });

  it('falls back to default gas estimation settings if no network', () => {
    return expect(fetchUniversalGasPriceEstimate()).resolves.toStrictEqual({
      gasPrice: GAS_PRICE_DEFAULT.initial.toString()
    });
  });
});
