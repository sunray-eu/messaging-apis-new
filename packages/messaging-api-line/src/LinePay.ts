import querystring from 'querystring';

import AxiosError from '@sunray-eu/axios-error';
import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError as BaseAxiosError,
} from 'axios';
import warning from 'warning';
import { invariant } from 'ts-invariant';

import * as LineTypes from './LineTypes';

function handleError(
  err: BaseAxiosError<{
    returnCode: string;
    returnMessage: string;
  }>
): never {
  if (err.response && err.response.data) {
    const { returnCode, returnMessage } = err.response.data;
    const msg = `LINE PAY API - ${returnCode} ${returnMessage}`;
    throw new AxiosError(msg, err);
  }
  throw new AxiosError(err.message, err);
}

function throwWhenNotSuccess<T>(
  res: AxiosResponse<{
    returnCode: string;
    returnMessage: string;
    info?: T;
  }>
): T | undefined {
  if (res.data.returnCode !== '0000') {
    const { returnCode, returnMessage } = res.data;
    const msg = `LINE PAY API - ${returnCode} ${returnMessage}`;
    throw new AxiosError(msg, {
      response: res,
      config: res.config,
      request: res.request,
    });
  }
  return res.data.info;
}

export default class LinePay {
  /**
   * @deprecated Use `new LinePay(...)` instead.
   */
  static connect(config: LineTypes.LinePayConfig): LinePay {
    warning(
      false,
      '`LineNotify.connect(...)` is deprecated. Use `new LineNotify(...)` instead.'
    );
    return new LinePay(config);
  }

  /**
   * The underlying axios instance.
   */
  readonly axios: AxiosInstance;

  constructor({
    channelId,
    channelSecret,
    sandbox = false,
    origin,
  }: LineTypes.LinePayConfig) {
    const linePayOrigin = sandbox
      ? 'https://sandbox-api-pay.line.me'
      : 'https://api-pay.line.me';

    this.axios = axios.create({
      baseURL: `${origin || linePayOrigin}/v2/`,
      headers: {
        'Content-Type': 'application/json',
        'X-LINE-ChannelId': channelId,
        'X-LINE-ChannelSecret': channelSecret,
      },
    });
  }

  getPayments({
    transactionId,
    orderId,
  }: {
    transactionId?: string;
    orderId?: string;
  } = {}) {
    invariant(
      transactionId || orderId,
      'getPayments: One of `transactionId` or `orderId` must be provided'
    );

    const query: {
      transactionId?: string;
      orderId?: string;
    } = {};

    if (transactionId) {
      query.transactionId = transactionId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    return this.axios
      .get(`/payments?${querystring.stringify(query)}`)
      .then(throwWhenNotSuccess, handleError);
  }

  getAuthorizations({
    transactionId,
    orderId,
  }: {
    transactionId?: string;
    orderId?: string;
  } = {}) {
    invariant(
      transactionId || orderId,
      'getAuthorizations: One of `transactionId` or `orderId` must be provided'
    );

    const query: {
      transactionId?: string;
      orderId?: string;
    } = {};

    if (transactionId) {
      query.transactionId = transactionId;
    }

    if (orderId) {
      query.orderId = orderId;
    }

    return this.axios
      .get(`/payments/authorizations?${querystring.stringify(query)}`)
      .then(throwWhenNotSuccess, handleError);
  }

  reserve({
    productName,
    amount,
    currency,
    confirmUrl,
    orderId,
    ...options
  }: {
    productName: string;
    amount: number;
    currency: LineTypes.LinePayCurrency;
    confirmUrl: string;
    orderId: string;
    productImageUrl?: string;
    mid?: string;
    oneTimeKey?: string;
    confirmUrlType?: 'CLIENT' | 'SERVER';
    checkConfirmUrlBrowser?: boolean;
    cancelUrl?: string;
    packageName?: string;
    deliveryPlacePhone?: string;
    payType?: 'NORMAL' | 'PREAPPROVED';
    langCd?: 'ja' | 'ko' | 'en' | 'zh-Hans' | 'zh-Hant' | 'th';
    capture?: boolean;
    extras?: Record<string, unknown>;
  }) {
    return this.axios
      .post('/payments/request', {
        productName,
        amount,
        currency,
        confirmUrl,
        orderId,
        ...options,
      })
      .then(throwWhenNotSuccess, handleError);
  }

  confirm(
    transactionId: string,
    {
      amount,
      currency,
    }: {
      amount: number;
      currency: LineTypes.LinePayCurrency;
    }
  ) {
    return this.axios
      .post(`/payments/${transactionId}/confirm`, {
        amount,
        currency,
      })
      .then(throwWhenNotSuccess, handleError);
  }

  capture(
    transactionId: string,
    {
      amount,
      currency,
    }: {
      amount: number;
      currency: LineTypes.LinePayCurrency;
    }
  ) {
    return this.axios
      .post(`/payments/authorizations/${transactionId}/capture`, {
        amount,
        currency,
      })
      .then(throwWhenNotSuccess, handleError);
  }

  void(transactionId: string) {
    return this.axios
      .post(`/payments/authorizations/${transactionId}/void`)
      .then(throwWhenNotSuccess, handleError);
  }

  refund(transactionId: string, options: { refundAmount?: number } = {}) {
    return this.axios
      .post(`/payments/${transactionId}/refund`, options)
      .then(throwWhenNotSuccess, handleError);
  }
}
